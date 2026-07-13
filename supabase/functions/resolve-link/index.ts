/**
 * SwipeCat Full Deferred Link Engine
 * Edge Function: resolve-link
 *
 * Called when a friend taps a shared SwipeCat product link.
 * 1. Fingerprints the visitor (IP + User-Agent hash)
 * 2. Stores the fingerprint + product_id in deferred_links (TTL: 2 hours)
 * 3. Looks up the product in the DB for rich Open Graph / Twitter Card meta
 * 4. Serves a redirect page that tries to open the app via URI scheme,
 *    falling back to the App Store if the app isn't installed.
 *
 * The OG/Twitter meta tags ensure shared links render rich preview cards
 * in iMessage, WhatsApp, Twitter/X, Facebook, and Slack.
 *
 * NOTE: Cache-Control is set to no-store for the HTML response so the
 * redirect logic doesn't get cached. Link-preview crawlers (iMessage,
 * WhatsApp) may cache the OG data on their end after first fetch — that's
 * expected and not something we control here.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_STORE_URL = "https://apps.apple.com/app/swipecat/id6746619087";
const URI_SCHEME = "swipecat://product/";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS / broken tags */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip Amazon CDN size tokens from an image URL to get the full-resolution
 * version. Mirrors the logic in src/lib/products.ts → highResAmazonImage().
 */
function highResAmazonImage(url: string): string {
  if (!url.includes("media-amazon.com") && !url.includes("images-amazon.com")) {
    return url;
  }
  return url
    .replace(/\._[^.]+_(?=\.[a-z]{2,4}(\?|$))/gi, "")
    .replace(/_[A-Z]{1,3}\d+_/g, "")
    .replace(/\.{2,}/g, ".");
}

/** Truncate a string to maxLen characters, adding ellipsis if truncated */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

async function buildFingerprint(req: Request): Promise<string> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const raw = `${ip}|${ua}`;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Product lookup types ─────────────────────────────────────────────────────

interface ProductMeta {
  title: string;
  image: string;
  price: number | null;
  currency: string | null;
}

const FALLBACK_META: ProductMeta = {
  title: "Discover amazing products with a swipe",
  image: "",
  price: null,
  currency: null,
};

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const url = new URL(req.url);
  const productId = url.searchParams.get("p");

  if (!productId) {
    return new Response("Missing product id", { status: 400 });
  }

  // 1. Fingerprint the visitor
  const fingerprint = await buildFingerprint(req);

  // 2. Store in Supabase (cleanup expired records first)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await supabase.rpc("cleanup_expired_deferred_links");
  await supabase.from("deferred_links").insert({
    fingerprint,
    product_id: productId,
  });

  // 3. Look up the product for OG meta tags
  //    Try asin first (that's what buildShareLink uses), then fall back to id
  let product: ProductMeta = FALLBACK_META;

  console.log(`[resolve-link] Looking up product with param: "${productId}"`);
  console.log(`[resolve-link] SUPABASE_URL: ${SUPABASE_URL ? "set" : "MISSING"}`);
  console.log(`[resolve-link] SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? "set (" + SUPABASE_SERVICE_KEY.substring(0, 10) + "...)" : "MISSING"}`);

  const { data: byAsin, error: asinError } = await supabase
    .from("products")
    .select("title, image, price, currency")
    .eq("asin", productId)
    .limit(1)
    .single();

  console.log(`[resolve-link] ASIN lookup result:`, { data: byAsin, error: asinError?.message });

  if (byAsin) {
    product = byAsin as ProductMeta;
  } else {
    // Fall back to matching by id (UUID)
    const { data: byId, error: idError } = await supabase
      .from("products")
      .select("title, image, price, currency")
      .eq("id", productId)
      .limit(1)
      .single();
    console.log(`[resolve-link] ID lookup result:`, { data: byId, error: idError?.message });
    if (byId) {
      product = byId as ProductMeta;
    }
  }

  console.log(`[resolve-link] Final product:`, product);

  // Build OG values
  const ogTitle = escapeHtml(truncate(product.title, 90));
  const ogImage = product.image ? highResAmazonImage(product.image) : "";
  const ogDescription = escapeHtml(
    product.price != null
      ? `$${product.price.toFixed(2)} · Swipe right if you love it 🐱`
      : "Swipe right if you love it 🐱"
  );
  const ogUrl = escapeHtml(url.toString());

  // Build OG meta tag block
  const ogTags = `
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:url" content="${ogUrl}" />
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDescription}" />
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}`;

  // 4. Serve the redirect HTML with rich OG preview
  const deepLink = `${URI_SCHEME}${productId}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${ogTitle} — SwipeCat</title>
  ${ogTags}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #fdf8f4;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .logo { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; }
    p { font-size: 16px; color: #666; margin-bottom: 32px; }
    .btn {
      display: inline-block;
      background: #E5306B;
      color: white;
      font-size: 17px;
      font-weight: 700;
      padding: 16px 32px;
      border-radius: 50px;
      text-decoration: none;
      box-shadow: 0 4px 20px rgba(229,48,107,0.35);
    }
  </style>
</head>
<body>
  <div class="logo">🐱</div>
  <h1>Opening SwipeCat...</h1>
  <p>Discover amazing products with a swipe.</p>
  <a class="btn" href="${APP_STORE_URL}">Get SwipeCat Free →</a>
  <script>
    // Try to open the app via URI scheme
    window.location.href = "${deepLink}";
    // If app isn't installed, fall back to App Store after 2.5s
    setTimeout(function() {
      window.location.href = "${APP_STORE_URL}";
    }, 2500);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // no-store prevents the redirect logic from being cached by CDNs.
      // Note: link-preview crawlers (iMessage, WhatsApp) may cache the OG
      // data on their end for a while after first fetch — that's expected.
      "Cache-Control": "no-store",
    },
  });
});

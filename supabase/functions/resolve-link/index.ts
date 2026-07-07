/**
 * SwipeCat Full Deferred Link Engine
 * Edge Function: resolve-link
 *
 * Called when a friend taps a shared SwipeCat product link.
 * 1. Fingerprints the visitor (IP + User-Agent hash)
 * 2. Stores the fingerprint + product_id in deferred_links (TTL: 2 hours)
 * 3. Serves a redirect page that tries to open the app via URI scheme,
 *    falling back to the App Store if the app isn't installed.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_STORE_URL = "https://apps.apple.com/app/swipecat/id6746619087";
const URI_SCHEME = "swipecat://product/";

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

  // 3. Serve the redirect HTML
  const deepLink = `${URI_SCHEME}${productId}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opening SwipeCat...</title>
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
      "Cache-Control": "no-store",
    },
  });
});

/**
 * SwipeCat Full Deferred Link Engine
 * Edge Function: claim-link
 *
 * Called silently on first app launch (before onboarding).
 * 1. Fingerprints the new user (IP + User-Agent hash)
 * 2. Looks for a matching unclaimed record created in the last 2 hours
 * 3. If found, marks it claimed and returns the product_id
 * 4. The app then shows that product before dropping into the normal feed
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const fingerprint = await buildFingerprint(req);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Look for a matching unclaimed record within the last 2 hours
  const { data, error } = await supabase
    .from("deferred_links")
    .select("id, product_id")
    .eq("fingerprint", fingerprint)
    .eq("claimed", false)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return new Response(JSON.stringify({ product_id: null }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Mark as claimed so it can't be used again
  await supabase
    .from("deferred_links")
    .update({ claimed: true })
    .eq("id", data.id);

  return new Response(JSON.stringify({ product_id: data.product_id }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

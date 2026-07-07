/**
 * SwipeCat Full Deferred Link Engine — Client Integration
 *
 * Provides:
 * 1. buildShareLink(product) — generates the deferred link URL for sharing
 * 2. claimDeferredLink()    — called on first launch to claim a pending link
 */

import type { Product } from "@/lib/products";

const SUPABASE_FUNCTIONS_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  "https://sqwjprhcophxlmmygwsk.supabase.co";

const RESOLVE_LINK_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/resolve-link`;
const CLAIM_LINK_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/claim-link`;

const CLAIMED_KEY = "swipecat:deferred-claimed:v1";

/**
 * Build the shareable deferred link URL for a product.
 * When the recipient taps this link, they get fingerprinted and redirected
 * to the app (or App Store if not installed).
 */
export function buildShareLink(product: Product): string {
  const productId = product.asin || product.id;
  return `${RESOLVE_LINK_URL}?p=${encodeURIComponent(productId)}`;
}

/**
 * Attempt to claim a deferred link on first app launch.
 * Returns the product_id if a matching link is found, or null otherwise.
 * Only runs once per device (uses localStorage flag).
 */
export async function claimDeferredLink(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    // Don't run if already claimed
    if (window.localStorage.getItem(CLAIMED_KEY)) return null;
  } catch {
    return null;
  }

  try {
    const res = await fetch(CLAIM_LINK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const productId = data?.product_id ?? null;

    // Mark as claimed regardless of result so we don't keep calling
    try {
      window.localStorage.setItem(CLAIMED_KEY, "1");
    } catch {
      // Ignore storage errors
    }

    return productId;
  } catch {
    return null;
  }
}

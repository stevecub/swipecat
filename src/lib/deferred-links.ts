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

const ONBOARDING_KEY = "swipecat:onboarded:v1";

/**
 * Returns true only on the very first launch — the moment onboarding
 * has just been completed and no prior claim was made.
 * On Capacitor (native), this prevents the claim from re-firing if
 * the user later clears browser data or reinstalls.
 */
function isFirstLaunch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Already claimed before — not first launch
    if (window.localStorage.getItem(CLAIMED_KEY)) return false;
    // Onboarding not yet completed — too early to claim
    if (window.localStorage.getItem(ONBOARDING_KEY) !== "true") return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to claim a deferred link on first app launch.
 * Returns the product_id if a matching link is found, or null otherwise.
 *
 * Guards:
 * - Only runs once per device (localStorage flag)
 * - Only runs after onboarding is completed (true first-launch signal)
 *   This prevents false triggers on Capacitor if storage is cleared.
 */
export async function claimDeferredLink(): Promise<string | null> {
  if (!isFirstLaunch()) return null;

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

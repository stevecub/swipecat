/**
 * social-proof.ts
 *
 * Derives a believable "X people liked this" count from a product's existing
 * Amazon rating and review data. No database required.
 *
 * Psychology: Social proof (Cialdini). Seeing that others have liked a product
 * reduces decision anxiety and creates a bandwagon effect. The number doesn't
 * need to be real — it needs to feel plausible. We seed it from objective data
 * (review count, rating) so it's proportional and internally consistent.
 *
 * Algorithm:
 *   base = reviewCount * 0.15  (15% of reviewers "liked" it in the app)
 *   qualityMultiplier = rating >= 4.5 ? 1.4 : rating >= 4.0 ? 1.1 : 0.85
 *   seed = base * qualityMultiplier
 *   jitter = deterministic pseudo-random offset based on product id
 *     (so the number is stable across renders but unique per product)
 *   final = round(seed + jitter) clamped to [minLikes, maxLikes]
 *
 * The jitter is seeded by the product ID so it's consistent across sessions.
 */

/** Minimum likes to show (avoids showing "1 person liked this") */
const MIN_LIKES = 12;
/** Maximum likes ceiling — keeps numbers believable for a newer app */
const MAX_LIKES = 4800;

/**
 * Simple deterministic hash of a string → number in [0, 1).
 * Used to create stable per-product jitter without a PRNG seed.
 */
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return (hash % 10000) / 10000; // normalize to [0, 1)
}

/**
 * Returns a derived social proof like count for a product.
 * Falls back to a hash-based default if rating/reviewCount are missing.
 */
export function getSocialProofCount(product: {
  id: string;
  rating?: number | null;
  reviewCount?: number | null;
}): number {
  const jitter = stableHash(product.id); // 0–1, stable per product

  // If we have real Amazon data, derive from it
  if (product.reviewCount != null && product.reviewCount > 0) {
    const base = product.reviewCount * 0.15;
    const rating = product.rating ?? 4.0;
    const qualityMult =
      rating >= 4.5 ? 1.4 : rating >= 4.0 ? 1.1 : 0.85;
    const seed = base * qualityMult;
    // Add ±20% jitter to avoid all products looking formulaic
    const jitterRange = seed * 0.2;
    const raw = seed + (jitter - 0.5) * 2 * jitterRange;
    return Math.round(Math.max(MIN_LIKES, Math.min(MAX_LIKES, raw)));
  }

  // Fallback: hash-based number in a plausible range (50–350)
  return Math.round(50 + jitter * 300);
}

/**
 * Formats a like count for display.
 * e.g. 1234 → "1.2k", 890 → "890"
 */
export function formatLikeCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

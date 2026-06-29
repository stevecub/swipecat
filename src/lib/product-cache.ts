/**
 * product-cache.ts
 *
 * Local cache of product data for liked/passed items.
 *
 * Problem: The Liked/Passed pages store only product IDs in localStorage,
 * then fetch product details from Supabase. But getProducts() only returns
 * the latest 500 items — older liked/passed items won't match, and offline
 * usage fails entirely.
 *
 * Solution: When a product is liked or passed, cache its full data object
 * in localStorage. The Liked/Passed pages read from this cache first,
 * falling back to the Supabase fetch only for items not in cache.
 *
 * Storage key: "swipecat:product-cache:v1"
 * Format: { [productId]: Product }
 */

import type { Product } from "./products";

const KEY = "swipecat:product-cache:v1";

/** Load the entire cache from localStorage */
function loadCache(): Record<string, Product> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Product>;
  } catch {
    return {};
  }
}

/** Persist the cache to localStorage */
function saveCache(cache: Record<string, Product>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage quota exceeded — silently degrade
  }
}

/**
 * Cache one or more products.
 * Call this whenever a product is liked or passed.
 */
export function cacheProducts(products: Product | Product[]) {
  const list = Array.isArray(products) ? products : [products];
  if (list.length === 0) return;

  const cache = loadCache();
  let changed = false;
  for (const p of list) {
    if (!cache[p.id]) {
      cache[p.id] = p;
      changed = true;
    }
  }
  if (changed) saveCache(cache);
}

/**
 * Get cached products by IDs.
 * Returns an array of products in the same order as the input IDs.
 * Missing items (not in cache) are returned as undefined.
 */
export function getCachedProducts(ids: string[]): (Product | undefined)[] {
  const cache = loadCache();
  return ids.map((id) => cache[id]);
}

/**
 * Get a single cached product by ID.
 */
export function getCachedProduct(id: string): Product | undefined {
  const cache = loadCache();
  return cache[id];
}

/**
 * Remove products from cache (e.g. when clearing liked/passed lists).
 */
export function removeCachedProducts(ids: string[]) {
  if (ids.length === 0) return;
  const cache = loadCache();
  let changed = false;
  for (const id of ids) {
    if (cache[id]) {
      delete cache[id];
      changed = true;
    }
  }
  if (changed) saveCache(cache);
}

/**
 * Clear the entire product cache.
 */
export function clearProductCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore
  }
}

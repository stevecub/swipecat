/**
 * queue-cache.ts
 *
 * Persists the Discover queue order (product IDs) and the current product ID
 * to localStorage so that navigating away from Discover and back restores the
 * exact same card the user was looking at.
 *
 * Why localStorage instead of sessionStorage:
 * - On iOS/Capacitor, WKWebView can clear sessionStorage more aggressively.
 * - We use a versioned key and clear it explicitly when the user changes
 *   categories or when the app detects a stale cache.
 *
 * What's stored:
 * - queueIds: ordered array of product IDs representing the queue
 * - currentId: the product ID the user was looking at
 * - categories: the category selection hash when the queue was built
 *   (if categories change, the cache is invalidated)
 */

const QUEUE_KEY = "swipecat:queue-cache:v1";

interface QueueCache {
  queueIds: string[];
  currentId: string | null;
  categoriesHash: string;
}

/** Create a simple hash of selected category IDs for comparison */
export function categoriesHash(selected: string[]): string {
  return [...selected].sort().join(",");
}

export function saveQueueCache(queueIds: string[], currentId: string | null, selected: string[]): void {
  try {
    const data: QueueCache = {
      queueIds,
      currentId,
      categoriesHash: categoriesHash(selected),
    };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded or unavailable */ }
}

export function loadQueueCache(): QueueCache | null {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as QueueCache;
    if (!Array.isArray(data.queueIds) || data.queueIds.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearQueueCache(): void {
  try { localStorage.removeItem(QUEUE_KEY); } catch { /* ignore */ }
}

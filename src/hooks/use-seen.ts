/**
 * useSeen — tracks every product ID that has appeared in the Discover deck.
 *
 * Persisted to localStorage so duplicates are prevented across app restarts.
 * An item is marked "seen" the moment it enters the visible deck window —
 * regardless of whether the user swipes it or navigates away first.
 *
 * The seen set is intentionally separate from liked/passed so that:
 *  - Items can be removed from liked/passed without re-appearing in Discover.
 *  - The Liked and Passed pages are unaffected.
 *
 * Storage key: "swipecat:seen:v1"
 */

import { useCallback, useRef } from "react";

const KEY = "swipecat:seen:v1";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistSeen(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // Storage quota exceeded — silently ignore; deduplication degrades gracefully
  }
}

export function useSeen() {
  // Use a ref so the Set is stable across renders and mutations are synchronous.
  // We don't need React re-renders when items are added — the Discover page
  // already re-filters via its own useMemo that reads from useProductLists.
  const seenRef = useRef<Set<string>>(loadSeen());

  /** Returns the current seen set (stable reference — mutate via markSeen). */
  const seenSet = seenRef.current;

  /**
   * Mark one or more product IDs as seen and persist immediately.
   * Safe to call with IDs that are already in the set.
   */
  const markSeen = useCallback((ids: string | string[]) => {
    const list = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of list) {
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id);
        changed = true;
      }
    }
    if (changed) persistSeen(seenRef.current);
  }, []);

  /**
   * Clear the entire seen history (e.g. for a "Reset Discover" feature).
   * Not currently exposed in the UI but available if needed.
   */
  const clearSeen = useCallback(() => {
    seenRef.current = new Set();
    persistSeen(seenRef.current);
  }, []);

  return { seenSet, markSeen, clearSeen };
}

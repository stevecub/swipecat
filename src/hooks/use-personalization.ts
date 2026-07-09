/**
 * use-personalization.ts
 *
 * Tracks per-category preference scores based on swipe history and exposes
 * a balanced shuffle function for the product queue.
 *
 * Psychology: Relevance drives dopamine. When the feed feels like it "gets you",
 * users swipe more and stay longer. But over-personalization kills discovery
 * and makes the feed feel monotonous.
 *
 * Scoring rules (asymmetric — likes are a stronger signal than passes):
 *   like  → category score += 1.0
 *   pass  → category score -= 0.3
 *   scores are clamped to [-5, 20] to prevent runaway bias
 *
 * Balanced shuffle (replaces the old 60/40 weighted sort):
 *   1. Group products by category
 *   2. Shuffle each category group independently (Fisher-Yates)
 *   3. Interleave round-robin across categories so no single category
 *      dominates any section of the feed
 *   4. Within each round, apply a light personalization nudge:
 *      categories with higher scores go slightly earlier in the round
 *      (but still within the same ~N-card window, not pushed 200 cards ahead)
 *
 * This guarantees roughly equal representation of all selected categories
 * while still rewarding engagement with a subtle ordering preference.
 */

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/products";

const KEY = "swipecat:personalization:v1";

type CategoryScores = Record<string, number>;

const MIN_SCORE = -5;
const MAX_SCORE = 20;
const LIKE_DELTA = 1.0;
const PASS_DELTA = -0.3;

function load(): CategoryScores {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CategoryScores) : {};
  } catch {
    return {};
  }
}

function persist(scores: CategoryScores) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    // Ignore storage errors
  }
}

function clamp(val: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, val));
}

/** Fisher-Yates shuffle — mutates in place */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function usePersonalization() {
  const [scores, setScores] = useState<CategoryScores>(() => load());

  useEffect(() => {
    setScores(load());
  }, []);

  /** Record a like action — boost the product's category */
  const recordLike = useCallback((product: Product) => {
    setScores((prev) => {
      const cat = product.category;
      const next = {
        ...prev,
        [cat]: clamp((prev[cat] ?? 0) + LIKE_DELTA),
      };
      persist(next);
      return next;
    });
  }, []);

  /** Record a pass action — slightly penalize the product's category */
  const recordPass = useCallback((product: Product) => {
    setScores((prev) => {
      const cat = product.category;
      const next = {
        ...prev,
        [cat]: clamp((prev[cat] ?? 0) + PASS_DELTA),
      };
      persist(next);
      return next;
    });
  }, []);

  /**
   * Reset all personalization scores — called when the user changes
   * their category selections, signaling they want a fresh feed.
   */
  const resetScores = useCallback(() => {
    const fresh: CategoryScores = {};
    persist(fresh);
    setScores(fresh);
  }, []);

  /**
   * Balanced interleaving shuffle.
   *
   * Groups products by category, shuffles each group, then deals them
   * round-robin so every category gets roughly equal representation
   * throughout the feed. Within each round, categories with higher
   * personalization scores go first (a subtle nudge, not domination).
   *
   * Returns a new array — does NOT mutate the input.
   */
  const balancedShuffle = useCallback(
    (products: Product[]): Product[] => {
      if (products.length === 0) return [];

      // 1. Group by category
      const groups: Record<string, Product[]> = {};
      for (const p of products) {
        const cat = p.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(p);
      }

      // 2. Shuffle each group independently
      const categoryKeys = Object.keys(groups);
      for (const key of categoryKeys) {
        shuffleInPlace(groups[key]);
      }

      // 3. Sort category keys by score (descending) for round ordering
      //    This gives a light nudge — preferred categories appear slightly
      //    earlier within each round, but all categories still appear in
      //    every round.
      const sortedKeys = [...categoryKeys].sort((a, b) => {
        const sa = scores[a] ?? 0;
        const sb = scores[b] ?? 0;
        // Add a tiny random jitter so equal-score categories aren't always
        // in the same alphabetical order
        return (sb + Math.random() * 0.5) - (sa + Math.random() * 0.5);
      });

      // 4. Interleave round-robin
      const result: Product[] = [];
      const pointers: Record<string, number> = {};
      for (const key of sortedKeys) pointers[key] = 0;

      const maxLen = Math.max(...sortedKeys.map((k) => groups[k].length));

      for (let round = 0; round < maxLen; round++) {
        for (const key of sortedKeys) {
          if (pointers[key] < groups[key].length) {
            result.push(groups[key][pointers[key]]);
            pointers[key]++;
          }
        }
      }

      return result;
    },
    [scores],
  );

  // Keep the old name as an alias for backward compat in case it's used elsewhere
  const weightedSort = balancedShuffle;

  return { scores, recordLike, recordPass, weightedSort, balancedShuffle, resetScores };
}

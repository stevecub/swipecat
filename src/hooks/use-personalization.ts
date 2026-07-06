/**
 * use-personalization.ts
 *
 * Tracks per-category preference scores based on swipe history and exposes
 * a weighted sort function for the product queue.
 *
 * Psychology: Relevance drives dopamine. When the feed feels like it "gets you",
 * users swipe more and stay longer. The 60/40 weighted shuffle keeps the feed
 * feeling personalized while preserving the variable-reward randomness that
 * makes swiping addictive.
 *
 * Scoring rules (asymmetric — likes are a stronger signal than passes):
 *   like  → category score += 1.0
 *   pass  → category score -= 0.3
 *   scores are clamped to [-5, 20] to prevent runaway bias
 *
 * Weighted sort:
 *   sortKey = categoryScore * 0.6 + random(0, 1) * 0.4
 *   Higher sortKey = earlier in the queue.
 *   The 40% random component preserves discovery and variable-reward feel.
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
   * Weighted sort: 60% preference score + 40% random.
   * Returns a new sorted array — does NOT mutate the input.
   *
   * Products in preferred categories bubble toward the front while
   * the random component ensures discovery and variable reward.
   */
  const weightedSort = useCallback(
    (products: Product[]): Product[] => {
      return [...products].sort((a, b) => {
        const scoreA = scores[a.category] ?? 0;
        const scoreB = scores[b.category] ?? 0;
        const keyA = scoreA * 0.6 + Math.random() * 0.4;
        const keyB = scoreB * 0.6 + Math.random() * 0.4;
        return keyB - keyA; // descending — higher score first
      });
    },
    [scores],
  );

  return { scores, recordLike, recordPass, weightedSort };
}

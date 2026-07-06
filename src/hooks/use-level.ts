/**
 * use-level.ts
 *
 * Tracks the user's total lifetime swipe count and maps it to a
 * leveling system with fun titles and XP progress.
 *
 * Psychology:
 *  - Progress illusion: visible XP bar makes every swipe feel meaningful
 *  - Commitment escalation: higher levels = more invested = harder to leave
 *  - Achievement: level-ups trigger celebration, creating peak moments
 *  - Identity: level titles become part of how users see themselves in the app
 *
 * Levels:
 *  1. Cat Curious       (0 swipes)
 *  2. Deal Spotter      (25 swipes)
 *  3. Swipe Enthusiast  (100 swipes)
 *  4. Bargain Hunter    (250 swipes)
 *  5. Taste Maker       (500 swipes)
 *  6. Swipe Master      (1000 swipes)
 *  7. Deal Whisperer    (2000 swipes)
 *  8. Legendary Finder  (5000 swipes)
 */

import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "swipecat:level:v1";

export type LevelInfo = {
  level: number;
  title: string;
  emoji: string;
  currentXP: number;       // swipes since this level started
  xpToNext: number;        // swipes needed to reach next level
  totalSwipes: number;     // lifetime total
  progress: number;        // 0-1 progress toward next level
};

const LEVELS = [
  { threshold: 0,    title: "Cat Curious",      emoji: "🐱" },
  { threshold: 25,   title: "Deal Spotter",     emoji: "🔍" },
  { threshold: 100,  title: "Swipe Enthusiast", emoji: "⚡" },
  { threshold: 250,  title: "Bargain Hunter",   emoji: "🎯" },
  { threshold: 500,  title: "Taste Maker",      emoji: "✨" },
  { threshold: 1000, title: "Swipe Master",     emoji: "🏆" },
  { threshold: 2000, title: "Deal Whisperer",   emoji: "🔮" },
  { threshold: 5000, title: "Legendary Finder", emoji: "👑" },
] as const;

function getLevelIndex(totalSwipes: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalSwipes >= LEVELS[i].threshold) return i;
  }
  return 0;
}

function computeLevelInfo(totalSwipes: number): LevelInfo {
  const idx = getLevelIndex(totalSwipes);
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1];

  const currentXP = totalSwipes - current.threshold;
  const xpToNext = next ? next.threshold - current.threshold : 0;
  const progress = next ? Math.min(1, currentXP / xpToNext) : 1;

  return {
    level: idx + 1,
    title: current.title,
    emoji: current.emoji,
    currentXP,
    xpToNext,
    totalSwipes,
    progress,
  };
}

function loadTotal(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return 0;
    return JSON.parse(raw) as number;
  } catch {
    return 0;
  }
}

function persistTotal(total: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(total));
  } catch {
    // Ignore
  }
}

export function useLevel() {
  const [totalSwipes, setTotalSwipes] = useState<number>(() => loadTotal());
  const [justLeveledUp, setJustLeveledUp] = useState(false);
  const prevLevelRef = useRef(getLevelIndex(loadTotal()));

  // Sync from storage on mount
  useEffect(() => {
    const stored = loadTotal();
    setTotalSwipes(stored);
    prevLevelRef.current = getLevelIndex(stored);
  }, []);

  const recordSwipeForLevel = useCallback(() => {
    setTotalSwipes((prev) => {
      const next = prev + 1;
      persistTotal(next);

      // Check if we leveled up
      const prevLevel = getLevelIndex(prev);
      const newLevel = getLevelIndex(next);
      if (newLevel > prevLevel) {
        setJustLeveledUp(true);
      }

      return next;
    });
  }, []);

  const dismissLevelUp = useCallback(() => {
    setJustLeveledUp(false);
  }, []);

  const levelInfo = computeLevelInfo(totalSwipes);

  return {
    levelInfo,
    justLeveledUp,
    recordSwipeForLevel,
    dismissLevelUp,
  };
}

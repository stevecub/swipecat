/**
 * use-streak.ts
 *
 * Tracks the user's consecutive daily swipe streak.
 *
 * Psychology: Loss aversion. A visible streak counter creates a powerful
 * commitment escalation loop — the longer the streak, the more painful it
 * feels to break it. This is the same mechanic Duolingo uses to drive
 * daily active users.
 *
 * Rules:
 *  - A "streak day" is any calendar day on which the user swipes at least once.
 *  - The streak increments when the user swipes on a new calendar day.
 *  - If the user misses a day entirely, the streak resets to 1 on their next swipe.
 *  - The streak is stored in localStorage and survives app restarts.
 */

import { useCallback, useEffect, useState } from "react";

const KEY = "swipecat:streak:v1";

type StreakData = {
  count: number;       // current streak length in days
  lastSwipeDate: string | null; // ISO date string "YYYY-MM-DD" of last swipe day
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load(): StreakData {
  if (typeof window === "undefined") return { count: 0, lastSwipeDate: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { count: 0, lastSwipeDate: null };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { count: 0, lastSwipeDate: null };
  }
}

function persist(data: StreakData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns the current streak count and a function to record a swipe.
 * Call `recordSwipe()` whenever the user swipes a card.
 */
export function useStreak() {
  const [streakData, setStreakData] = useState<StreakData>(() => load());

  // Sync from storage on mount
  useEffect(() => {
    setStreakData(load());
  }, []);

  const recordSwipe = useCallback(() => {
    setStreakData((prev) => {
      const today = todayStr();
      const yesterday = yesterdayStr();

      // Already recorded a swipe today — no change needed
      if (prev.lastSwipeDate === today) return prev;

      let newCount: number;
      if (prev.lastSwipeDate === yesterday) {
        // Swiped yesterday — extend the streak
        newCount = prev.count + 1;
      } else {
        // Missed a day (or first ever swipe) — start fresh at 1
        newCount = 1;
      }

      const next: StreakData = { count: newCount, lastSwipeDate: today };
      persist(next);
      return next;
    });
  }, []);

  /**
   * Whether the streak is "at risk" — user hasn't swiped today yet.
   * Used to show a warning nudge in the UI.
   */
  const isAtRisk =
    streakData.count > 0 && streakData.lastSwipeDate !== todayStr();

  return {
    streakCount: streakData.count,
    isAtRisk,
    recordSwipe,
  };
}

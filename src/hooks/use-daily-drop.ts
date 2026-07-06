/**
 * use-daily-drop.ts
 *
 * Provides a "Daily Drop" — a curated set of 15 products that rotates
 * every day at midnight (local time). The selection is deterministic per
 * day so all users see the same "drop" on the same date, creating a
 * shared social experience and appointment mechanic.
 *
 * Psychology:
 *  - Scarcity: products are only available for 24 hours
 *  - Appointment mechanic: gives users a reason to open the app TODAY
 *  - Loss aversion: "if I don't check, I'll miss something great"
 *  - Curiosity: "what dropped today?"
 *
 * How it works:
 *  - Uses the date string as a seed to deterministically select 15 products
 *    from the full product pool (1-2 per category for variety)
 *  - Provides a live countdown timer to midnight
 *  - Tracks which daily drops the user has already seen
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/products";

const DAILY_DROP_SIZE = 15;
const SEEN_KEY = "swipecat:daily-drop-seen:v1";

/** Simple seeded pseudo-random number generator (mulberry32) */
function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Convert a date string to a numeric seed */
function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Get today's date as YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Calculate seconds remaining until midnight local time */
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/** Format seconds as HH:MM:SS */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Select the daily drop products from the full pool.
 * Uses seeded randomness based on today's date for deterministic selection.
 * Ensures category diversity (max 2 per category).
 */
function selectDailyDrop(products: Product[], date: string): Product[] {
  if (products.length === 0) return [];

  const seed = dateSeed(date);
  
  // Create a seeded shuffle of all products
  const shuffled = [...products];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pick products with category diversity (max 2 per category)
  const categoryCounts: Record<string, number> = {};
  const selected: Product[] = [];

  for (const product of shuffled) {
    if (selected.length >= DAILY_DROP_SIZE) break;
    const cat = product.category;
    const count = categoryCounts[cat] || 0;
    if (count < 2) {
      selected.push(product);
      categoryCounts[cat] = count + 1;
    }
  }

  // If we didn't get enough (unlikely), fill from remaining
  if (selected.length < DAILY_DROP_SIZE) {
    const selectedIds = new Set(selected.map((p) => p.id));
    for (const product of shuffled) {
      if (selected.length >= DAILY_DROP_SIZE) break;
      if (!selectedIds.has(product.id)) {
        selected.push(product);
      }
    }
  }

  return selected;
}

/** Check if the user has already viewed today's drop */
function hasSeenTodaysDrop(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw === todayStr();
  } catch {
    return false;
  }
}

/** Mark today's drop as seen */
function markDropSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, todayStr());
  } catch {
    // Ignore
  }
}

export function useDailyDrop(allProducts: Product[]) {
  const [countdown, setCountdown] = useState(secondsUntilMidnight());
  const [hasSeenDrop, setHasSeenDrop] = useState(() => hasSeenTodaysDrop());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(secondsUntilMidnight());
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Today's curated selection
  const dailyProducts = useMemo(
    () => selectDailyDrop(allProducts, todayStr()),
    [allProducts],
  );

  // Whether there's a new unseen drop available
  const hasNewDrop = !hasSeenDrop && dailyProducts.length > 0;

  const markSeen = useCallback(() => {
    markDropSeen();
    setHasSeenDrop(true);
  }, []);

  return {
    dailyProducts,
    countdown,
    formattedCountdown: formatCountdown(countdown),
    hasNewDrop,
    markSeen,
  };
}

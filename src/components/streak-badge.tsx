/**
 * streak-badge.tsx
 *
 * Displays the user's current swipe streak in the app header.
 * Tapping the badge reveals a succinct tooltip explaining the mechanic.
 *
 * Psychology: Loss aversion + commitment escalation.
 * A visible flame icon with a day count creates a powerful pull to open
 * the app every day. The "at risk" pulsing state adds urgency when the
 * user hasn't swiped yet today.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  count: number;
  isAtRisk: boolean;
};

export function StreakBadge({ count, isAtRisk }: Props) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Close tooltip when tapping anywhere outside the badge
  useEffect(() => {
    if (!tooltipOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [tooltipOpen]);

  // Don't show anything until the user has established a streak
  if (count === 0) return null;

  return (
    <div ref={badgeRef} className="relative flex items-center">
      {/* ── Badge (tap target) ── */}
      <AnimatePresence>
        <motion.button
          key={count}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center gap-1 rounded-full px-1 py-0.5 -mx-1 focus:outline-none active:opacity-70"
          onClick={() => setTooltipOpen((o) => !o)}
          aria-label={`${count}-day swipe streak. Tap to learn more.`}
          aria-expanded={tooltipOpen}
        >
          {/* Flame icon — pulses when at risk */}
          <motion.span
            animate={isAtRisk ? { scale: [1, 1.2, 1] } : {}}
            transition={isAtRisk ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" } : {}}
            className="text-base leading-none select-none"
            aria-hidden="true"
          >
            🔥
          </motion.span>

          <span
            className={`text-sm font-black tabular-nums leading-none ${
              isAtRisk ? "text-orange-500" : "text-foreground"
            }`}
          >
            {count}
          </span>

          {/* "day streak" label — only shown when not at risk to save space */}
          {!isAtRisk && (
            <span className="text-[10px] font-medium text-muted-foreground leading-none hidden sm:inline">
              day streak
            </span>
          )}

          {/* At-risk nudge */}
          {isAtRisk && (
            <span className="text-[10px] font-semibold text-orange-500 leading-none">
              Swipe!
            </span>
          )}
        </motion.button>
      </AnimatePresence>

      {/* ── Tooltip ── */}
      <AnimatePresence>
        {tooltipOpen && (
          <motion.div
            role="tooltip"
            className="absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 rounded-2xl bg-gray-900 px-4 py-3 shadow-xl"
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
          >
            {/* Arrow pointing up to badge */}
            <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-gray-900" />

            <p className="text-[13px] font-black text-white">
              🔥 {count}-Day Streak
            </p>
            <p className="mt-1 text-[12px] leading-snug text-gray-300">
              Swipe every day to keep it alive. Miss a day and it resets.
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-orange-400">
              Don't break the chain.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

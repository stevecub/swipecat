/**
 * streak-badge.tsx
 *
 * Displays the user's current swipe streak in the app header.
 *
 * Psychology: Loss aversion + commitment escalation.
 * A visible flame icon with a day count creates a powerful pull to open
 * the app every day. The "at risk" pulsing state adds urgency when the
 * user hasn't swiped yet today.
 */

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  count: number;
  isAtRisk: boolean;
};

export function StreakBadge({ count, isAtRisk }: Props) {
  // Don't show anything until the user has established a streak
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={count}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex items-center gap-1"
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
      </motion.div>
    </AnimatePresence>
  );
}

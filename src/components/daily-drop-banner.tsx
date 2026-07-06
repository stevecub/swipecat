/**
 * daily-drop-banner.tsx
 *
 * Tappable banner for the Daily Drop. Shows how many products remain
 * in today's drop rather than a countdown to midnight — this creates
 * a completion-drive (progress psychology) rather than abstract urgency.
 *
 * When active, collapses to a slim pill showing "✨ X of 15 remaining"
 * with an X to exit back to the normal feed.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

type Props = {
  hasNewDrop: boolean;
  isActive: boolean;
  dropCount: number;       // total products in today's drop
  remaining: number;       // how many the user hasn't swiped yet
  onActivate: () => void;
  onDeactivate: () => void;
};

export function DailyDropBanner({
  hasNewDrop,
  isActive,
  dropCount,
  remaining,
  onActivate,
  onDeactivate,
}: Props) {
  if (dropCount === 0) return null;

  const swiped = dropCount - remaining;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        className="mb-2"
      >
        {!isActive ? (
          /* ── Inactive: full CTA banner ── */
          <motion.button
            onClick={onActivate}
            className="relative flex w-full items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-4 py-2.5 text-left text-white shadow-lg shadow-fuchsia-500/20"
            whileTap={{ scale: 0.97 }}
            animate={{
              rotate: [0, -1.5, 1.5, -1.5, 1.5, 0],
              scale: [1, 1.01, 1.01, 1.01, 1.01, 1],
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          >
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">Today's Drop</span>
                {hasNewDrop && (
                  <motion.span
                    className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black text-fuchsia-600"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                  >
                    NEW
                  </motion.span>
                )}
              </div>
              <p className="text-[11px] font-medium text-white/80">
                {dropCount} hand-picked products — tap to explore
              </p>
            </div>
            {/* Progress indicator if partially swiped */}
            {swiped > 0 ? (
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 backdrop-blur">
                <span className="text-[11px] font-bold tabular-nums">{remaining} left</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 backdrop-blur">
                <Sparkles className="h-3 w-3" />
                <span className="text-[11px] font-bold">{dropCount} picks</span>
              </div>
            )}
          </motion.button>
        ) : (
          /* ── Active: slim progress pill ── */
          <motion.div
            className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-4 py-2 text-white shadow-lg shadow-fuchsia-500/20"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-black">Daily Drop</span>
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <span className="text-[10px] font-bold tabular-nums">
                  {swiped} of {dropCount}
                </span>
              </div>
            </div>
            <button
              onClick={onDeactivate}
              className="rounded-full bg-white/20 p-1.5 backdrop-blur active:bg-white/30"
              aria-label="Exit Daily Drop"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

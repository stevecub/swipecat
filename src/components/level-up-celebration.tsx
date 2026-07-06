/**
 * level-up-celebration.tsx
 *
 * Full-screen celebration overlay that appears when the user levels up.
 * Shows the new level title with confetti burst and a share prompt.
 *
 * Psychology:
 *  - Peak moment: creates a memorable emotional high
 *  - Achievement: validates the user's investment
 *  - Social sharing: turns milestones into organic acquisition moments
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import type { LevelInfo } from "@/hooks/use-level";

type Props = {
  visible: boolean;
  levelInfo: LevelInfo;
  onDismiss: () => void;
};

export function LevelUpCelebration({ visible, levelInfo, onDismiss }: Props) {
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    if (visible && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      // Fire confetti burst
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.45, x: 0.5 },
        colors: ["#E5306B", "#ff6b9d", "#ffd700", "#7c3aed", "#10b981", "#f97316"],
        scalar: 1.2,
      });
      // Second burst slightly delayed
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5, x: 0.3 },
          colors: ["#ffd700", "#ff6b9d", "#7c3aed"],
        });
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5, x: 0.7 },
          colors: ["#ffd700", "#ff6b9d", "#10b981"],
        });
      }, 300);
    }
    if (!visible) {
      confettiFiredRef.current = false;
    }
  }, [visible]);

  const handleShare = async () => {
    const shareText = `I just hit Level ${levelInfo.level}: ${levelInfo.emoji} ${levelInfo.title} on SwipeCat! 🎉`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SwipeCat Level Up!",
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
    }
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
        >
          <motion.div
            className="mx-6 w-full max-w-[300px] rounded-3xl bg-white p-8 text-center shadow-2xl"
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Level emoji */}
            <motion.div
              className="text-6xl"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            >
              {levelInfo.emoji}
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <p className="mt-4 text-sm font-bold uppercase tracking-widest text-fuchsia-500">
                Level {levelInfo.level}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
                {levelInfo.title}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                You've swiped {levelInfo.totalSwipes.toLocaleString()} times. Keep going!
              </p>
            </motion.div>

            {/* Buttons */}
            <motion.div
              className="mt-6 flex flex-col gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={handleShare}
                className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 py-3 text-sm font-bold text-white shadow-md active:opacity-80"
              >
                Share my level 🎉
              </button>
              <button
                onClick={onDismiss}
                className="w-full rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-600 active:bg-gray-200"
              >
                Keep swiping
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

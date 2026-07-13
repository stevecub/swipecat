/**
 * daily-drop-expired.tsx
 *
 * A playful overlay shown when the Daily Drop banner countdown expires
 * (user didn't tap within 15 seconds). Shows a brief "See you tomorrow!"
 * fanfare with confetti, then auto-dismisses.
 *
 * Psychology:
 *  - Positive closure: ends on a warm note even though they didn't engage
 *  - Appointment mechanic: "tomorrow" plants the seed for the next visit
 *  - FOMO lite: reminds them there IS something to come back for
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function DailyDropExpired({ visible, onDismiss }: Props) {
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    if (visible && !confettiFiredRef.current) {
      confettiFiredRef.current = true;

      // A lighter, playful burst — not as intense as the completion confetti
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.45, x: 0.5 },
        colors: ["#7c3aed", "#d946ef", "#ffd700", "#ec4899"],
        scalar: 1.1,
        gravity: 0.8,
      });

      // Small side sparkles
      setTimeout(() => {
        confetti({
          particleCount: 30,
          angle: 60,
          spread: 40,
          origin: { x: 0.1, y: 0.5 },
          colors: ["#ffd700", "#d946ef"],
          scalar: 0.8,
        });
        confetti({
          particleCount: 30,
          angle: 120,
          spread: 40,
          origin: { x: 0.9, y: 0.5 },
          colors: ["#7c3aed", "#ec4899"],
          scalar: 0.8,
        });
      }, 200);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        onDismiss();
      }, 4000);
    }

    if (!visible) {
      confettiFiredRef.current = false;
    }
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
        >
          <motion.div
            className="mx-6 w-full max-w-[280px] rounded-3xl bg-white p-7 text-center shadow-2xl"
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 22, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Waving hand emoji with bounce */}
            <motion.div
              className="text-5xl"
              initial={{ scale: 0, rotate: -30 }}
              animate={{
                scale: 1,
                rotate: [0, 15, -10, 15, -5, 0],
              }}
              transition={{
                scale: { type: "spring", stiffness: 400, damping: 12, delay: 0.15 },
                rotate: { duration: 0.8, delay: 0.3, ease: "easeInOut" },
              }}
            >
              👋
            </motion.div>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="mt-3 text-xl font-black tracking-tight text-gray-900">
                See you tomorrow!
              </h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                A fresh Daily Drop lands every day at midnight.
                Come back for new hand-picked finds!
              </p>
            </motion.div>

            {/* Subtle sparkle accent */}
            <motion.p
              className="mt-4 text-xs font-medium text-fuchsia-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              ✨ New products every day ✨
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

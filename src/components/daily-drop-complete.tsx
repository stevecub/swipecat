/**
 * daily-drop-complete.tsx
 *
 * Full-screen celebration overlay shown when the user finishes all
 * products in today's Daily Drop. Fires confetti, shows a "Come back
 * tomorrow" message, then auto-dismisses back to the normal feed.
 *
 * Psychology:
 *  - Peak-end rule: ends the drop on a memorable high note
 *  - Completion satisfaction: rewards finishing the set
 *  - Appointment mechanic: "come back tomorrow" plants the seed for
 *    the next session before the user has even left
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function DailyDropComplete({ visible, onDismiss }: Props) {
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    if (visible && !confettiFiredRef.current) {
      confettiFiredRef.current = true;

      // Main burst from center
      confetti({
        particleCount: 180,
        spread: 120,
        origin: { y: 0.4, x: 0.5 },
        colors: ["#7c3aed", "#d946ef", "#ec4899", "#ffd700", "#f97316", "#10b981"],
        scalar: 1.3,
      });

      // Side bursts for extra drama
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ["#7c3aed", "#ffd700", "#ec4899"],
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ["#d946ef", "#ffd700", "#10b981"],
        });
      }, 250);

      // Final gentle shower
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.3, x: 0.5 },
          gravity: 0.6,
          colors: ["#ffd700", "#ec4899", "#7c3aed"],
          scalar: 0.9,
        });
      }, 600);

      // Auto-dismiss after 3.5 seconds
      setTimeout(() => {
        onDismiss();
      }, 3500);
    }

    if (!visible) {
      confettiFiredRef.current = false;
    }
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
        >
          <motion.div
            className="mx-6 w-full max-w-[300px] rounded-3xl bg-white p-8 text-center shadow-2xl"
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big emoji */}
            <motion.div
              className="text-6xl"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            >
              ✨
            </motion.div>

            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <p className="mt-4 text-sm font-bold uppercase tracking-widest text-fuchsia-500">
                Drop Complete!
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
                You got them all 🎉
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                A fresh drop lands tomorrow at midnight. Come back and see what's new!
              </p>
            </motion.div>

            {/* Auto-dismiss hint */}
            <motion.p
              className="mt-5 text-xs text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Returning to your feed…
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

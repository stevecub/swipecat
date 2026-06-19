import { motion, AnimatePresence } from "framer-motion";

const MAX_HINT_SWIPES = 2;

export function SwipeHints({ swipeCount }: { swipeCount: number }) {
  const visible = swipeCount < MAX_HINT_SWIPES;

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2"
          >
            <motion.div
              animate={{ x: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold tracking-tight text-[var(--color-pass)] shadow-lg"
            >
              <span>← Pass</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
          >
            <motion.div
              animate={{ x: [0, 8, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="pointer-events-none flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold tracking-tight text-[var(--color-like)] shadow-lg"
            >
              <span>Like →</span>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

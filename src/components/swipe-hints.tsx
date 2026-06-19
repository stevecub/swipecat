import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MAX_HINT_SWIPES = 2;

export function SwipeHints({ swipeCount }: { swipeCount: number }) {
  const visible = swipeCount < MAX_HINT_SWIPES;

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2"
          >
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg"
            >
              <ChevronLeft className="h-6 w-6 text-[var(--color-pass)]" strokeWidth={2.5} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
          >
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg"
            >
              <ChevronRight className="h-6 w-6 text-[var(--color-like)]" strokeWidth={2.5} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

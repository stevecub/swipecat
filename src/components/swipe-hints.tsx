import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MAX_HINT_SWIPES = 2;

export function SwipeHints({ swipeCount }: { swipeCount: number }) {
  const visible = swipeCount < MAX_HINT_SWIPES;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-20"
        >
          {/* LEFT — Pass */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <motion.div
              animate={{ x: [0, -18, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--color-pass)] px-3 py-2.5 text-white shadow-2xl ring-2 ring-white/40"
            >
              <div className="flex items-center">
                <motion.div
                  animate={{ x: [2, -2, 2], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                  className="flex"
                >
                  <ChevronLeft className="h-5 w-5 -mr-3" strokeWidth={3} />
                  <ChevronLeft className="h-5 w-5 -mr-3" strokeWidth={3} />
                  <ChevronLeft className="h-5 w-5" strokeWidth={3} />
                </motion.div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest leading-none">
                Swipe
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-90">
                Pass
              </div>
            </motion.div>
          </div>

          {/* RIGHT — Like */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <motion.div
              animate={{ x: [0, 18, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--color-like)] px-3 py-2.5 text-white shadow-2xl ring-2 ring-white/40"
            >
              <div className="flex items-center">
                <motion.div
                  animate={{ x: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                  className="flex"
                >
                  <ChevronRight className="h-5 w-5 -ml-3" strokeWidth={3} />
                  <ChevronRight className="h-5 w-5 -ml-3" strokeWidth={3} />
                  <ChevronRight className="h-5 w-5" strokeWidth={3} />
                </motion.div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest leading-none">
                Swipe
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-90">
                Like
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MAX_HINT_SWIPES = 2;

export function SwipeHints({ swipeCount }: { swipeCount: number }) {
  const expanded = swipeCount < MAX_HINT_SWIPES;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* LEFT — Like (swipe right →) */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <motion.div
          animate={{
            scale: expanded ? 1 : 0.45,
            x: expanded ? 0 : -14,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="flex origin-left flex-col items-center rounded-2xl bg-[var(--color-like)] px-3 py-2.5 text-white shadow-2xl ring-2 ring-white/40"
        >
          <div className="flex items-center">
            <motion.div
              animate={expanded ? { x: [-2, 2, -2], opacity: [0.5, 1, 0.5] } : { x: 0, opacity: 1 }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              className="flex -space-x-1"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
            </motion.div>
          </div>
          <motion.div
            animate={{ opacity: expanded ? 1 : 0, height: expanded ? "auto" : 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest leading-none">
              Swipe
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-90">
              Like
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT — Pass (swipe left ←) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <motion.div
          animate={{
            scale: expanded ? 1 : 0.45,
            x: expanded ? 0 : 14,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="flex origin-right flex-col items-center rounded-2xl bg-[var(--color-pass)] px-3 py-2.5 text-white shadow-2xl ring-2 ring-white/40"
        >
          <div className="flex items-center">
            <motion.div
              animate={expanded ? { x: [2, -2, 2], opacity: [0.5, 1, 0.5] } : { x: 0, opacity: 1 }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              className="flex -space-x-1"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
            </motion.div>
          </div>
          <motion.div
            animate={{ opacity: expanded ? 1 : 0, height: expanded ? "auto" : 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest leading-none">
              Swipe
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-90">
              Pass
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

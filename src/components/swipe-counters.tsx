import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";

/**
 * Displays persistent like/pass counters on the swipe screen.
 *
 * - Like counter on the LEFT (because you swipe RIGHT to like)
 * - Pass counter on the RIGHT (because you swipe LEFT to pass)
 *
 * Counters animate with a brief scale pulse when incremented.
 */
export function SwipeCounters({
  likeCount,
  passCount,
}: {
  likeCount: number;
  passCount: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex items-end justify-between px-4">
      {/* Like counter — LEFT side (swipe right = like) */}
      <Counter
        count={likeCount}
        icon={<Heart className="h-3.5 w-3.5 fill-current" />}
        color="var(--color-like)"
        label="Liked"
      />

      {/* Pass counter — RIGHT side (swipe left = pass) */}
      <Counter
        count={passCount}
        icon={<X className="h-3.5 w-3.5" strokeWidth={3} />}
        color="var(--color-pass)"
        label="Passed"
      />
    </div>
  );
}

function Counter({
  count,
  icon,
  color,
  label,
}: {
  count: number;
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={count}
          initial={{ scale: 1.4, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, white)`, color }}
        >
          {icon}
          <span className="text-xs font-bold tabular-nums">{count}</span>
        </motion.div>
      </AnimatePresence>
      <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

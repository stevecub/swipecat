import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";

/**
 * Displays persistent like/pass counters below the swipe card.
 *
 * - Like counter on the LEFT (because you swipe RIGHT to like)
 * - Pass counter on the RIGHT (because you swipe LEFT to pass)
 *
 * Counters animate with a brief scale pulse when incremented.
 * Uses solid background colors for full iOS compatibility.
 */
export function SwipeCounters({
  likeCount,
  passCount,
}: {
  likeCount: number;
  passCount: number;
}) {
  return (
    <>
      {/* Like counter — LEFT side (swipe right = like) */}
      <Counter
        count={likeCount}
        icon={<Heart className="h-4 w-4 fill-current" />}
        bgColor="#dcfce7"
        textColor="#16a34a"
        label="Liked"
      />

      {/* Pass counter — RIGHT side (swipe left = pass) */}
      <Counter
        count={passCount}
        icon={<X className="h-4 w-4" strokeWidth={3} />}
        bgColor="#fee2e2"
        textColor="#dc2626"
        label="Passed"
      />
    </>
  );
}

function Counter({
  count,
  icon,
  bgColor,
  textColor,
  label,
}: {
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={count}
          initial={{ scale: 1.35, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {icon}
          <span className="text-sm font-bold tabular-nums">{count}</span>
        </motion.div>
      </AnimatePresence>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

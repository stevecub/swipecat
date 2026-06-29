import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";

/**
 * Displays persistent like/pass counters in the header row.
 *
 * Renders a three-column layout:
 *   [Like counter]  [SwipeCat branding]  [Pass counter]
 *
 * - Like counter on the LEFT (swipe right = like)
 * - Pass counter on the RIGHT (swipe left = pass)
 *
 * Counters animate with a spring pulse when incremented.
 */
export function SwipeCounters({
  likeCount,
  passCount,
  brandingSlot,
}: {
  likeCount: number;
  passCount: number;
  brandingSlot: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between">
      {/* Like counter — LEFT */}
      <Counter
        count={likeCount}
        icon={<Heart className="h-3.5 w-3.5 fill-current" />}
        bgColor="#dcfce7"
        textColor="#16a34a"
        label="Liked"
      />

      {/* Branding — CENTER */}
      <div className="flex items-center gap-2">
        {brandingSlot}
      </div>

      {/* Pass counter — RIGHT */}
      <Counter
        count={passCount}
        icon={<X className="h-3.5 w-3.5" strokeWidth={3} />}
        bgColor="#fee2e2"
        textColor="#dc2626"
        label="Passed"
      />
    </div>
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
    <div className="flex flex-col items-center gap-0.5">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={count}
          initial={{ scale: 1.35, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 shadow-sm"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {icon}
          <span className="text-xs font-bold tabular-nums">{count}</span>
        </motion.div>
      </AnimatePresence>
      <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

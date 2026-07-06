/**
 * level-progress.tsx
 *
 * A compact progress bar + level title that sits in the header area.
 * Shows the user their current level, title, and progress toward the next one.
 *
 * Psychology:
 *  - Progress illusion: even small swipe counts feel meaningful
 *  - Goal gradient: as the bar fills, urgency to complete increases
 *  - Endowed progress: bar starts partially filled at each new level
 */

import { motion } from "framer-motion";
import type { LevelInfo } from "@/hooks/use-level";

type Props = {
  levelInfo: LevelInfo;
};

export function LevelProgress({ levelInfo }: Props) {
  const isMaxLevel = levelInfo.xpToNext === 0;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      {/* Level badge */}
      <span className="text-sm leading-none">{levelInfo.emoji}</span>

      {/* Progress bar + label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-bold text-foreground/70 truncate">
            {levelInfo.title}
          </span>
          {!isMaxLevel && (
            <span className="text-[9px] font-semibold text-muted-foreground tabular-nums ml-1 flex-shrink-0">
              {levelInfo.currentXP}/{levelInfo.xpToNext}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
    </div>
  );
}

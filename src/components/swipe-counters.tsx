import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";
import { Share } from "@capacitor/share";

/** App Store URL for SwipeCat */
const APP_STORE_URL = "https://apps.apple.com/app/swipecat/id6783462851";

/**
 * Triggers the native iOS Share Sheet.
 * Falls back gracefully to the Web Share API (for browser/dev mode),
 * and silently ignores errors if the user cancels the share dialog.
 */
async function triggerShare(text: string, title: string) {
  try {
    // Capacitor Share — uses native UIActivityViewController on iOS
    await Share.share({
      title,
      text,
      url: APP_STORE_URL,
      dialogTitle: title,
    });
  } catch (err: any) {
    // "Share canceled" is not a real error — ignore it
    if (err?.message?.toLowerCase().includes("cancel")) return;
    // Fallback: Web Share API (works in browser / dev mode)
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${text}\n${APP_STORE_URL}` });
      } catch {
        // User cancelled — ignore
      }
    }
  }
}

/**
 * Displays persistent like/pass counters in the header row.
 *
 * Renders a three-column layout:
 *   [Like counter]  [SwipeCat branding]  [Pass counter]
 *
 * - Like counter on the LEFT  (swipe right = like)
 * - Pass counter on the RIGHT (swipe left = pass)
 *
 * Tapping either counter opens the native iOS Share Sheet.
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
  const handleShareLiked = () => {
    const text =
      likeCount === 0
        ? "I just started discovering products on SwipeCat! 🐱 Download it and find things you'll love."
        : `I've liked ${likeCount} product${likeCount === 1 ? "" : "s"} on SwipeCat! 🐱 Discover products you'll love — download SwipeCat:`;
    triggerShare(text, "Share SwipeCat");
  };

  const handleSharePassed = () => {
    const text =
      passCount === 0
        ? "I just started swiping on SwipeCat! 🐱 Download it and find things you'll love."
        : `I've passed on ${passCount} product${passCount === 1 ? "" : "s"} on SwipeCat! 🐱 Think you can beat my score? Download SwipeCat:`;
    triggerShare(text, "Share SwipeCat");
  };

  return (
    <div className="flex w-full items-center justify-between">
      {/* Like counter — LEFT */}
      <Counter
        count={likeCount}
        icon={<Heart className="h-3.5 w-3.5 fill-current" />}
        bgColor="#dcfce7"
        textColor="#16a34a"
        label="Liked"
        onTap={handleShareLiked}
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
        onTap={handleSharePassed}
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
  onTap,
}: {
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col items-center gap-0.5 active:opacity-70 transition-opacity"
      aria-label={`${label}: ${count}. Tap to share.`}
    >
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
    </button>
  );
}

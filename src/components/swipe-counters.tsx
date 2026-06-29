import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Share2, Trash2 } from "lucide-react";
import { Share } from "@capacitor/share";

/** App Store URL for SwipeCat */
const APP_STORE_URL = "https://apps.apple.com/app/swipecat/id6783462851";

/**
 * Triggers the native iOS Share Sheet.
 * Falls back gracefully to the Web Share API (for browser/dev mode).
 */
async function triggerShare(text: string, title: string) {
  try {
    await Share.share({
      title,
      text,
      url: APP_STORE_URL,
      dialogTitle: title,
    });
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("cancel")) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${text}\n${APP_STORE_URL}` });
      } catch {
        // User cancelled
      }
    }
  }
}

/**
 * Displays persistent like/pass counters in the header row.
 * Tapping a counter opens a small menu with Share and Clear All options.
 */
export function SwipeCounters({
  likeCount,
  passCount,
  brandingSlot,
  onClearLiked,
  onClearPassed,
}: {
  likeCount: number;
  passCount: number;
  brandingSlot: React.ReactNode;
  onClearLiked: () => void;
  onClearPassed: () => void;
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
        onShare={handleShareLiked}
        onClear={onClearLiked}
        clearLabel="Clear all liked items"
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
        onShare={handleSharePassed}
        onClear={onClearPassed}
        clearLabel="Clear all passed items"
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
  onShare,
  onClear,
  clearLabel,
}: {
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
  onShare: () => void;
  onClear: () => void;
  clearLabel: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClear = () => {
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmClear = () => {
    setConfirmOpen(false);
    onClear();
  };

  const handleShare = () => {
    setMenuOpen(false);
    onShare();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex flex-col items-center gap-0.5 active:opacity-70 transition-opacity"
        aria-label={`${label}: ${count}. Tap for options.`}
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

      {/* Dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 z-50 min-w-[140px] rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden"
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              <button
                type="button"
                onClick={handleShare}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Share2 className="h-4 w-4 text-gray-500" />
                Share
              </button>
              <div className="h-px bg-gray-100" />
              <button
                type="button"
                onClick={handleClear}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[280px] rounded-2xl bg-white p-5 shadow-2xl text-center"
            >
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {clearLabel}?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This can't be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 active:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white active:bg-red-600"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

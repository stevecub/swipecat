/**
 * share-prompt.tsx
 *
 * A subtle, non-intrusive share prompt that slides up from the bottom
 * after the user swipes right (likes) a product. It appears intermittently
 * (not on every like) to avoid fatigue.
 *
 * Psychology:
 *  - Peak moment capture: the instant of liking is the emotional high
 *  - Being helpful: framed as "your friend would love this" not "share our app"
 *  - Low friction: tap anywhere on the banner to open native share sheet
 *  - Intermittent: appears every 5th like to avoid banner blindness
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2 } from "lucide-react";
import { type Product } from "@/lib/products";
import { buildShareLink } from "@/lib/deferred-links";

const SHOW_EVERY_N_LIKES = 5;
const AUTO_DISMISS_MS = 5000;
const LIKE_COUNT_KEY = "swipecat:share-prompt-likes:v1";

function getLikeCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(window.localStorage.getItem(LIKE_COUNT_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function incrementLikeCount(): number {
  const next = getLikeCount() + 1;
  try {
    window.localStorage.setItem(LIKE_COUNT_KEY, String(next));
  } catch {
    // Ignore
  }
  return next;
}

export function useSharePrompt() {
  const [promptProduct, setPromptProduct] = useState<Product | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLike = useCallback((product: Product) => {
    const count = incrementLikeCount();
    if (count % SHOW_EVERY_N_LIKES === 0) {
      setPromptProduct(product);
      // Auto-dismiss after 5 seconds
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setPromptProduct(null);
      }, AUTO_DISMISS_MS);
    }
  }, []);

  const dismiss = useCallback(() => {
    setPromptProduct(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return { promptProduct, onLike, dismiss };
}

type Props = {
  product: Product | null;
  onDismiss: () => void;
};

export function SharePrompt({ product, onDismiss }: Props) {
  const handleShare = async () => {
    if (!product) return;

    const shareUrl = buildShareLink(product);
    const shareText = `I found this on SwipeCat and thought you'd love it! ${product.title}\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
        });
      } catch {
        // User cancelled — fall through to dismiss
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // Ignore clipboard errors
      }
    }
    onDismiss();
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          {/* Entire banner is clickable — triggers share */}
          <button
            onClick={handleShare}
            className="relative flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.2)] ring-1 ring-black/5 text-left active:scale-[0.98] transition-transform"
          >
            {/* Product thumbnail */}
            <img
              src={product.image}
              alt=""
              className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
            />

            {/* Text — full width, no truncation on the headline */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-gray-900 leading-tight">
                Know someone who'd love this?
              </p>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {product.title}
              </p>
            </div>

            {/* Share icon pill */}
            <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-primary p-2.5 text-primary-foreground shadow-sm">
              <Share2 className="h-4 w-4" />
            </div>

            {/* Dismiss X */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 active:bg-gray-300"
              aria-label="Dismiss"
            >
              <span className="text-xs leading-none">&times;</span>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

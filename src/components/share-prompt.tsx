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
 *  - Low friction: one tap opens native share sheet
 *  - Intermittent: appears every 5th like to avoid banner blindness
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2 } from "lucide-react";
import { buildBuyUrl, type Product } from "@/lib/products";

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

    const shareText = `Check this out on Amazon! ${product.title}`;
    const shareUrl = buildBuyUrl(product);

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled
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
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.2)] ring-1 ring-black/5">
            {/* Product thumbnail */}
            <img
              src={product.image}
              alt=""
              className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
            />

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-gray-900 leading-tight truncate">
                Know someone who'd love this?
              </p>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {product.title}
              </p>
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-primary-foreground shadow-sm active:opacity-80"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">Send</span>
            </button>

            {/* Dismiss X */}
            <button
              onClick={onDismiss}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 active:bg-gray-300"
              aria-label="Dismiss"
            >
              <span className="text-xs leading-none">&times;</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * share-prompt.tsx
 *
 * A subtle, non-intrusive share prompt that slides up from the bottom
 * when the user dwells on a card for 3+ seconds, indicating genuine interest.
 *
 * Psychology:
 *  - Dwell = interest: if someone stares at a card for 3s they're engaged
 *  - Being helpful: framed as "your friend would love this" not "share our app"
 *  - Low friction: tap anywhere on the banner to open native share sheet
 *  - Not spammy: only fires once per card, and has a cooldown between prompts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2 } from "lucide-react";
import { type Product } from "@/lib/products";
import { buildShareLink } from "@/lib/deferred-links";

/** How long the user must dwell on a card before showing the prompt (ms) */
const DWELL_THRESHOLD_MS = 3000;
/** Auto-dismiss the banner after this many ms */
const AUTO_DISMISS_MS = 5000;
/** Minimum gap between consecutive share prompts (ms) to avoid fatigue */
const COOLDOWN_MS = 30000;

export function useSharePrompt() {
  const [promptProduct, setPromptProduct] = useState<Product | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPromptTimeRef = useRef<number>(0);
  const currentCardIdRef = useRef<string | null>(null);

  /**
   * Called by the parent whenever the top visible card changes.
   * Starts a 3-second dwell timer. If the card is still showing after 3s,
   * we surface the share prompt for that product.
   */
  const onCardVisible = useCallback((product: Product | null) => {
    // Clear any existing dwell timer
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    if (!product) {
      currentCardIdRef.current = null;
      return;
    }

    // Don't re-trigger for the same card
    if (product.id === currentCardIdRef.current) return;
    currentCardIdRef.current = product.id;

    // Start dwell timer
    dwellTimerRef.current = setTimeout(() => {
      // Check cooldown — don't spam the user
      const now = Date.now();
      if (now - lastPromptTimeRef.current < COOLDOWN_MS) return;

      // Show the prompt
      lastPromptTimeRef.current = now;
      setPromptProduct(product);

      // Auto-dismiss after 5 seconds
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setPromptProduct(null);
      }, AUTO_DISMISS_MS);
    }, DWELL_THRESHOLD_MS);
  }, []);

  const dismiss = useCallback(() => {
    setPromptProduct(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  return { promptProduct, onCardVisible, dismiss };
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

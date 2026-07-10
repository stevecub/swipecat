/**
 * share-prompt.tsx
 *
 * A subtle tooltip hint that appears after the user dwells on a card for 3+
 * seconds, teaching them they can long-press to share. The actual sharing is
 * handled by the long-press gesture in SwipeCard — this component just shows
 * the educational hint.
 *
 * Psychology:
 *  - Dwell = interest: 3s stare means they're engaged
 *  - Discoverability: teaches the long-press gesture without being intrusive
 *  - Low fatigue: 30s cooldown between hints, auto-dismisses after 3s
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** How long the user must dwell on a card before showing the hint (ms) */
const DWELL_THRESHOLD_MS = 3000;
/** Auto-dismiss the hint after this many ms */
const AUTO_DISMISS_MS = 3000;
/** Minimum gap between consecutive hints (ms) */
const COOLDOWN_MS = 30000;

export function useShareHint() {
  const [showHint, setShowHint] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHintTimeRef = useRef<number>(0);
  const currentCardIdRef = useRef<string | null>(null);

  /**
   * Called by the parent whenever the top visible card changes.
   * Starts a 3-second dwell timer. If the card is still showing after 3s,
   * we surface the "long-press to share" hint.
   */
  const onCardVisible = useCallback((cardId: string | null) => {
    // Clear any existing dwell timer
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    // Hide any existing hint when card changes
    setShowHint(false);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (!cardId) {
      currentCardIdRef.current = null;
      return;
    }

    // Don't re-trigger for the same card
    if (cardId === currentCardIdRef.current) return;
    currentCardIdRef.current = cardId;

    // Start dwell timer
    dwellTimerRef.current = setTimeout(() => {
      // Check cooldown
      const now = Date.now();
      if (now - lastHintTimeRef.current < COOLDOWN_MS) return;

      // Show the hint
      lastHintTimeRef.current = now;
      setShowHint(true);

      // Auto-dismiss after 3 seconds
      dismissTimerRef.current = setTimeout(() => {
        setShowHint(false);
      }, AUTO_DISMISS_MS);
    }, DWELL_THRESHOLD_MS);
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  return { showHint, onCardVisible, dismissHint };
}

type Props = {
  visible: boolean;
};

export function ShareHint({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-28 left-0 right-0 z-50 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.25 }}
        >
          <div className="rounded-full bg-black/80 px-4 py-2 shadow-lg backdrop-blur">
            <p className="text-xs font-medium text-white">
              Long-press the card to share it
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

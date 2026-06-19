import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Hand } from "lucide-react";

const KEY = "swipeshop:hints-dismissed:v1";

export function SwipeHints() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) {
      setShow(true);
      const t = setTimeout(() => dismiss(), 4500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, "1");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          onClick={dismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-xs flex-col items-center gap-6 px-6 text-white">
            <motion.div
              animate={{ x: [-30, 30, -30] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center gap-3"
            >
              <Hand className="h-10 w-10" />
            </motion.div>
            <div className="grid w-full grid-cols-2 gap-3 text-center text-sm font-medium">
              <div className="rounded-2xl bg-[var(--color-pass)]/90 p-4">
                <ArrowLeft className="mx-auto mb-1 h-5 w-5" />
                Swipe left to pass
              </div>
              <div className="rounded-2xl bg-[var(--color-like)]/90 p-4">
                <ArrowRight className="mx-auto mb-1 h-5 w-5" />
                Swipe right to like
              </div>
            </div>
            <p className="text-xs text-white/75">Tap anywhere to dismiss</p>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

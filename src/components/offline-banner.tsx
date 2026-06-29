import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * A compact banner that slides in from the top when the app is offline.
 * Modeled after Instagram's offline badge — clear but non-intrusive.
 */
export function OfflineBanner({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 bg-gray-800 px-4 py-2">
            <WifiOff className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-xs font-medium text-gray-300">
              No internet connection
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

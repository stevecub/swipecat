import { WifiOff, RefreshCw } from "lucide-react";
import { useState } from "react";

/**
 * Full-screen empty state shown when the Discover tab cannot load products
 * due to no internet connection. Follows best practices from Apple HIG and
 * top apps (Facebook, Instagram, Twitter):
 *
 * - Clear icon indicating the problem
 * - Concise, friendly message explaining what's happening
 * - What the user can do (retry or browse offline content)
 * - A retry button that gives the user a sense of control
 */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    if (!onRetry) return;
    setRetrying(true);
    onRetry();
    // Reset the button after a short delay so they can tap again
    setTimeout(() => setRetrying(false), 2000);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-9 w-9 text-muted-foreground" />
      </div>

      {/* Heading */}
      <h3 className="text-xl font-bold text-foreground">You're offline</h3>

      {/* Description */}
      <p className="max-w-[260px] text-sm leading-relaxed text-muted-foreground">
        Connect to the internet to discover new products. Your liked and passed items are still available offline.
      </p>

      {/* Retry button */}
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Checking..." : "Try again"}
      </button>

      {/* Subtle hint about offline content */}
      <p className="mt-4 text-[11px] text-muted-foreground/70">
        Tip: Your liked and passed items are saved on this device and viewable anytime.
      </p>
    </div>
  );
}

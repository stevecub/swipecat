import { motion, AnimatePresence } from "framer-motion";
import { Share } from "@capacitor/share";
import { ArrowRightLeft, Share2, ExternalLink, Trash2 } from "lucide-react";
import { buildBuyUrl, type Product } from "@/lib/products";
import { haptic } from "@/lib/haptics";

type Props = {
  product: Product;
  /** Which list the product is currently in */
  currentList: "liked" | "passed";
  /** Position to render the menu (viewport coordinates) */
  position: { x: number; y: number };
  onMove: () => void;
  onRemove: () => void;
  onClose: () => void;
};

async function shareProduct(product: Product) {
  const shareUrl = buildBuyUrl(product);
  const shareText = `I found this on SwipeCat and thought you'd love it!\n\n${shareUrl}`;
  try {
    await Share.share({
      title: product.title,
      text: shareText,
      dialogTitle: "Share this product",
    });
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message?.toLowerCase() ?? "";
    if (msg.includes("cancel")) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text: shareText });
      } catch {
        // User cancelled
      }
    }
  }
}

export function ProductContextMenu({
  product,
  currentList,
  position,
  onMove,
  onRemove,
  onClose,
}: Props) {
  const moveLabel = currentList === "liked" ? "Move to Passed" : "Move to Liked";

  const handleShare = async () => {
    onClose();
    await shareProduct(product);
  };

  const handleViewOnAmazon = () => {
    onClose();
    window.open(buildBuyUrl(product), "_blank", "noopener,noreferrer");
  };

  const handleMove = () => {
    haptic("light");
    onMove();
    onClose();
  };

  const handleRemove = () => {
    haptic("warning");
    onRemove();
    onClose();
  };

  // Calculate menu position — keep it within viewport bounds
  // Menu is ~180px wide and ~200px tall
  const menuWidth = 180;
  const menuHeight = 200;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 375;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 812;

  let left = position.x - menuWidth / 2;
  let top = position.y - menuHeight - 8; // prefer above the press point

  // Clamp horizontally
  if (left < 8) left = 8;
  if (left + menuWidth > viewportW - 8) left = viewportW - menuWidth - 8;

  // If not enough room above, show below
  if (top < 8) top = position.y + 8;
  // Clamp bottom
  if (top + menuHeight > viewportH - 8) top = viewportH - menuHeight - 8;

  return (
    <AnimatePresence>
      {/* Backdrop — tap outside dismisses without triggering anything else */}
      <motion.div
        key="ctx-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[100]"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      />

      {/* Menu panel */}
      <motion.div
        key="ctx-menu"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-[101] w-[180px] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleMove}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-800 active:bg-gray-100"
        >
          <ArrowRightLeft className="h-4 w-4 text-gray-500" />
          {moveLabel}
        </button>
        <div className="mx-3 h-px bg-gray-100" />
        <button
          type="button"
          onClick={handleShare}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-800 active:bg-gray-100"
        >
          <Share2 className="h-4 w-4 text-gray-500" />
          Share
        </button>
        <div className="mx-3 h-px bg-gray-100" />
        <button
          type="button"
          onClick={handleViewOnAmazon}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-800 active:bg-gray-100"
        >
          <ExternalLink className="h-4 w-4 text-gray-500" />
          View on Amazon
        </button>
        <div className="mx-3 h-px bg-gray-100" />
        <button
          type="button"
          onClick={handleRemove}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-500 active:bg-red-50"
        >
          <Trash2 className="h-4 w-4 text-red-400" />
          Remove
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

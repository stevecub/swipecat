import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Share } from "@capacitor/share";
import { buildBuyUrl, type Product } from "@/lib/products";
import { haptic } from "@/lib/haptics";
import { getSocialProofCount, formatLikeCount } from "@/lib/social-proof";
import { CatPaw } from "@/components/cat-paw";

type Action = "like" | "pass";

const SWIPE_COMMIT_DISTANCE = 110; // px to commit a swipe
const SWIPE_COMMIT_VELOCITY = 400; // px/s to commit via flick
const FLY_OFF_DISTANCE = 600;      // px the card travels off-screen

/**
 * SwipeCard — uses RAW pointer events for gesture handling.
 *
 * Why not Framer Motion's `drag` prop?
 * FM's drag system has internal state (pan session, constraints, elastic
 * calculations) that can get stuck when:
 * - A card transitions from drag=false to drag="x" (background → top)
 * - animate() is called on the same motion value the drag system "owns"
 * - The component re-renders mid-gesture
 *
 * By using raw pointer events + manual x.set(), we have ZERO internal state
 * that can lock up. The card will ALWAYS respond to touch.
 */
/** Long-press threshold in ms */
const LONG_PRESS_MS = 500;

/**
 * Triggers the native share sheet for a product.
 * Uses Capacitor Share plugin first, falls back to Web Share API.
 */
async function shareProduct(product: Product) {
  // Use the Amazon product URL directly — iMessage/WhatsApp auto-generate
  // rich previews (image, title, price) for Amazon links. The Supabase edge
  // function can't serve HTML on the free tier (rewrites to text/plain).
  const shareUrl = buildBuyUrl(product);
  const shareText = `I found this on SwipeCat and thought you'd love it!\n\n${shareUrl}`;
  try {
    await Share.share({
      title: product.title,
      text: shareText,
      dialogTitle: "Share this product",
    });
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("cancel")) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text: shareText });
      } catch {
        // User cancelled
      }
    }
  }
}

export function SwipeCard({
  product,
  onSwipe,
  isTop,
  stackIndex,
  dragProgress, // 0→ 1 from the top card, drives background card reveal
  onDragProgress, // callback to report drag progress to parent
  isDailyDrop = false,
}: {
  product: Product;
  onSwipe: (action: Action) => void;
  isTop: boolean;
  stackIndex: number;
  dragProgress: number; // simple number now, not a MotionValue
  onDragProgress?: (progress: number) => void;
  isDailyDrop?: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Visual transforms
  const rotate = useTransform(x, [-250, 0, 250], [-22, 0, 22]);
  const likeOpacity = useTransform(x, [30, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -30], [1, 0]);

  // Refs for gesture tracking — no React state to avoid re-renders during drag
  const gestureRef = useRef({
    active: false,        // is a drag currently happening?
    committed: false,     // has this card already been committed to fly off?
    startX: 0,           // pointer start position
    startY: 0,
    startTime: 0,
    lastX: 0,            // last pointer position (for velocity calc)
    lastTime: 0,
    velocityX: 0,        // estimated velocity
    pointerId: -1,       // which pointer we're tracking
    maxDist: 0,          // max distance moved (for tap detection)
    longPressTriggered: false, // did we fire a long-press share?
  });

  // Long-press timer ref
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Post-share cooldown: prevents the pointer-up after sharing from opening Amazon
  const shareJustFiredRef = useRef(false);

  // Reset state when this card mounts or becomes the top card
  useEffect(() => {
    if (isTop) {
      gestureRef.current.committed = false;
      gestureRef.current.active = false;
      x.set(0);
      y.set(0);
    }
  }, [isTop, x, y]);

  const commitSwipe = useCallback((direction: Action) => {
    const g = gestureRef.current;
    if (g.committed) return;
    g.committed = true;
    g.active = false;

    void haptic(direction === "like" ? "success" : "light");

    const sign = direction === "like" ? 1 : -1;
    const targetX = sign * FLY_OFF_DISTANCE;

    // Slight vertical arc
    const currentY = y.get();
    const targetY = currentY * 0.5; // continue in the direction of any vertical drift

    // Duration based on velocity
    const absVx = Math.abs(g.velocityX);
    const duration = absVx > SWIPE_COMMIT_VELOCITY
      ? Math.max(0.18, Math.min(0.32, FLY_OFF_DISTANCE / absVx))
      : 0.28;

    animate(x, targetX, {
      type: "tween",
      ease: [0.25, 0.46, 0.45, 0.94],
      duration,
      onComplete: () => {
        onSwipe(direction);
      },
    });

    animate(y, targetY, {
      type: "tween",
      ease: [0.25, 0.46, 0.45, 0.94],
      duration,
    });
  }, [onSwipe, x, y]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isTop) return;
    const g = gestureRef.current;
    if (g.committed) return;

    // Capture this pointer
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    g.active = true;
    g.pointerId = e.pointerId;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.startTime = performance.now();
    g.lastX = e.clientX;
    g.lastTime = performance.now();
    g.velocityX = 0;
    g.maxDist = 0;
    g.longPressTriggered = false;

    // Start long-press timer
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      // Only fire if finger hasn't moved much (still a press, not a drag)
      if (g.maxDist < 10 && g.active && !g.committed) {
        g.longPressTriggered = true;
        shareJustFiredRef.current = true;
        void haptic("medium");
        void shareProduct(product);
        // Reset the cooldown after a short delay so future taps work normally
        setTimeout(() => { shareJustFiredRef.current = false; }, 600);
      }
    }, LONG_PRESS_MS);
  }, [isTop, product]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g.active || g.committed || e.pointerId !== g.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const dist = Math.hypot(dx, dy);
    if (dist > g.maxDist) g.maxDist = dist;

    // Cancel long-press if finger moves too far (it's a drag, not a press)
    if (dist > 10 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Set card position directly — no middleware, no internal state
    // Apply dampening (0.7x) so the card moves more slowly/deliberately
    x.set(dx * 0.7);
    y.set(dy * 0.2); // dampen vertical movement more

    // Report drag progress to parent for background card reveal + paw animation
    // Use SIGNED progress: positive = right (like), negative = left (pass)
    const dampenedDx = dx * 0.7;
    if (onDragProgress) {
      const signedProgress = dampenedDx / SWIPE_COMMIT_DISTANCE; // -1 to +1 (can exceed)
      onDragProgress(signedProgress);
    }

    // Calculate velocity (exponential moving average)
    const now = performance.now();
    const dt = now - g.lastTime;
    if (dt > 0) {
      const instantVx = ((e.clientX - g.lastX) / dt) * 1000; // px/s
      g.velocityX = g.velocityX * 0.6 + instantVx * 0.4; // smooth
    }
    g.lastX = e.clientX;
    g.lastTime = now;

    // No mid-drag commit — card only commits on finger lift.
    // This lets the user drag freely and change their mind.
  }, [x, y, commitSwipe]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (e.pointerId !== g.pointerId) return;
    if (g.committed) return;

    g.active = false;

    const dx = e.clientX - g.startX;
    const elapsed = performance.now() - g.startTime;

    // Cancel long-press timer on pointer up
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If long-press just triggered share, don't do anything else
    if (g.longPressTriggered || shareJustFiredRef.current) {
      return;
    }

    // Check if this was a tap (not a drag)
    if (g.maxDist < 10 && elapsed < 250) {
      // It's a tap — open the product
      window.open(buildBuyUrl(product), "_blank", "noopener,noreferrer");
      return;
    }

    // Commit decision based on the card's ACTUAL position (dampened)
    // or a strong velocity flick. Decision only happens on lift-off.
    const cardX = x.get(); // actual card position (dampened)
    if (cardX > SWIPE_COMMIT_DISTANCE * 0.6 || g.velocityX > SWIPE_COMMIT_VELOCITY) {
      commitSwipe("like");
    } else if (cardX < -SWIPE_COMMIT_DISTANCE * 0.6 || g.velocityX < -SWIPE_COMMIT_VELOCITY) {
      commitSwipe("pass");
    } else {
      // Snap back to center
      if (onDragProgress) onDragProgress(0);
      animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
      animate(y, 0, { type: "spring", stiffness: 500, damping: 35 });
    }
  }, [x, y, product, commitSwipe]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (e.pointerId !== g.pointerId) return;
    if (g.committed) return;
    g.active = false;
    // Cancel long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Snap back on cancel
    animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
    animate(y, 0, { type: "spring", stiffness: 500, damping: 35 });
  }, [x, y]);

  // Background card transforms — simple CSS driven by |dragProgress| (now signed)
  const absDrag = Math.min(1, Math.abs(dragProgress));
  const bgScale = 1 - stackIndex * 0.04 + absDrag * 0.04;
  const bgYOffset = stackIndex * 10 - absDrag * 10;
  const bgOpacityVal = 0.85 + absDrag * 0.15;

  /**
   * Golden Card: products with rating ≥ 4.5 and reviewCount ≥ 1000 get a
   * special shimmer/glow treatment. Psychology: peak-end rule + variable reward.
   * Seeing a "golden" card mid-session creates a moment of delight and signals
   * high social proof, making the product feel more desirable.
   */
  const isGolden =
    product.rating != null &&
    product.rating >= 4.5 &&
    product.reviewCount != null &&
    product.reviewCount >= 1000;

  /** Social proof count — derived from Amazon data, stable per product */
  const likeCount = getSocialProofCount(product);
  const likeCountStr = formatLikeCount(likeCount);

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : bgYOffset,
        rotate: isTop ? rotate : 0,
        scale: isTop ? 1 : bgScale,
        opacity: isTop ? 1 : bgOpacityVal,
        zIndex: 10 - stackIndex,
        touchAction: "none",         // ALWAYS none — prevents browser gesture conflicts
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      initial={false}
      // Exit animation — card fades out after flying off (cleanup)
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      onPointerDown={isTop ? handlePointerDown : undefined}
      onPointerMove={isTop ? handlePointerMove : undefined}
      onPointerUp={isTop ? handlePointerUp : undefined}
      onPointerCancel={isTop ? handlePointerCancel : undefined}
    >
      <div className={`relative h-full w-full overflow-hidden rounded-[2rem] bg-card ${
          isGolden
            ? "shadow-[0_20px_60px_-10px_rgba(251,191,36,0.45)] ring-2 ring-amber-400/70"
            : "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] ring-1 ring-border"
        }`}>
        <img
          src={product.image}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-contain p-2 pt-14 pb-[140px]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        {/* Golden shimmer sweep — animated diagonal highlight for top-rated products */}
        {isGolden && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(251,191,36,0.18) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
          />
        )}

        {/* Swipe tint overlays */}
        {isTop && (
          <>
            <motion.div
              className="absolute inset-0 bg-[var(--color-like)]/30 pointer-events-none"
              style={{ opacity: likeOpacity }}
            />
            <motion.div
              className="absolute inset-0 bg-[var(--color-pass)]/30 pointer-events-none"
              style={{ opacity: passOpacity }}
            />
            <motion.div
              className="absolute left-5 top-6 rotate-[-12deg] rounded-lg border-4 border-[var(--color-like)] px-3 py-1 text-xl font-black tracking-widest text-[var(--color-like)]"
              style={{ opacity: likeOpacity }}
            >
              LIKE
            </motion.div>
            <motion.div
              className="absolute right-5 top-6 rotate-[12deg] rounded-lg border-4 border-[var(--color-pass)] px-3 py-1 text-xl font-black tracking-widest text-[var(--color-pass)]"
              style={{ opacity: passOpacity }}
            >
              PASS
            </motion.div>
          </>
        )}

        {/* Daily Drop badge — top-left corner with jiggle */}
        {isDailyDrop && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white shadow-md animate-badge-jiggle">
            ✨ Daily Drop
          </span>
        )}

        <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
          {/* Golden "Top Pick" badge — only shown on top-rated products */}
          {isGolden && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-amber-900 shadow-md animate-badge-jiggle">
              ⭐ TOP PICK
            </span>
          )}
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {product.category}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-1.5 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-base font-bold leading-tight">{product.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-white/85">{product.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-black">
                {product.price != null
                  ? `$${Number(product.price).toFixed(2)}`
                  : <span className="text-sm font-medium text-white/60">Price on Amazon</span>}
              </div>
            </div>
          </div>

          {/* Rating + review count badge */}
          {product.rating != null && product.rating > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur">
                {/* Star icons — filled/half/empty based on rating */}
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = product.rating! >= star;
                    const half = !filled && product.rating! >= star - 0.5;
                    return (
                      <svg
                        key={star}
                        viewBox="0 0 20 20"
                        className="h-3 w-3"
                        fill={filled ? "#FBBF24" : half ? "url(#half)" : "none"}
                        stroke="#FBBF24"
                        strokeWidth={1.5}
                      >
                        {half && (
                          <defs>
                            <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                              <stop offset="50%" stopColor="#FBBF24" />
                              <stop offset="50%" stopColor="transparent" />
                            </linearGradient>
                          </defs>
                        )}
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      </svg>
                    );
                  })}
                </span>
                <span className="text-[11px] font-semibold text-white">
                  {Number(product.rating).toFixed(1)}
                </span>
                {product.reviewCount != null && product.reviewCount > 0 && (
                  <span className="text-[11px] text-white/70">
                    ({product.reviewCount.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Social proof + tap hint row */}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {/* Social proof badge — always shown */}
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur">
              <svg viewBox="0 0 20 20" fill="#f87171" className="h-3 w-3" aria-hidden="true">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="text-[11px] font-semibold text-white">{likeCountStr} swipers liked this</span>
            </div>
            {isTop && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                Tap to view · Hold to share
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SwipeDeck({
  products,
  onAction,
  onVisibleIds,
  onIndexChange,
  initialIndex = 0,
  premarkWindow = 3,
  isDailyDrop = false,
}: {
  products: Product[];
  onAction: (product: Product, action: Action) => void;
  onVisibleIds?: (ids: string[]) => void;
  /** Called whenever the deck advances to a new card — lets the parent persist position */
  onIndexChange?: (index: number) => void;
  /** Restore a previously saved deck position (0 = start) */
  initialIndex?: number;
  premarkWindow?: number;
  isDailyDrop?: boolean;
}) {
  const [index, setIndex] = useState(() => {
    return initialIndex > 0 && initialIndex < products.length ? initialIndex : 0;
  });

  // Re-sync index when products array identity changes and initialIndex is provided.
  // This handles the case where the queue is restored from cache AFTER mount
  // (products starts empty, then fills in with the cached order + initialIndex).
  const prevProductsRef = useRef(products);
  const prevInitialIndexRef = useRef(initialIndex);
  useEffect(() => {
    const productsChanged = products !== prevProductsRef.current;
    const initialChanged = initialIndex !== prevInitialIndexRef.current;
    prevProductsRef.current = products;
    prevInitialIndexRef.current = initialIndex;

    if ((productsChanged || initialChanged) && initialIndex > 0 && initialIndex < products.length) {
      setIndex(initialIndex);
    }
  }, [products, initialIndex]);

  // Persist position on mount (so navigating away immediately after landing
  // still has the current card saved). Fire once when products are available.
  const mountSavedRef = useRef(false);
  useEffect(() => {
    if (!mountSavedRef.current && products.length > 0 && onIndexChange) {
      mountSavedRef.current = true;
      onIndexChange(index);
    }
  }, [products.length, index, onIndexChange]);

  const visible = useMemo(() => products.slice(index, index + premarkWindow), [products, index, premarkWindow]);

  // Track drag progress for background card reveal (0→1)
  // Updated via a subscription to the top card's x motion value
  const [dragProgress, setDragProgress] = useState(0);

  const prevVisibleKey = useRef<string>("");
  useEffect(() => {
    if (!onVisibleIds || visible.length === 0) return;
    const key = visible.map((p) => p.id).join(",");
    if (key === prevVisibleKey.current) return;
    prevVisibleKey.current = key;
    onVisibleIds(visible.map((p) => p.id));
  }, [visible, onVisibleIds]);

  const handle = useCallback((action: Action) => {
    const current = products[index];
    if (!current) return;
    onAction(current, action);
    setDragProgress(0);
    setIndex((i) => {
      const next = i + 1;
      onIndexChange?.(next);
      return next;
    });
  }, [products, index, onAction, onIndexChange]);

  if (index >= products.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-5xl">✨</div>
        <h3 className="text-xl font-bold">You're all caught up</h3>
        <p className="text-sm text-muted-foreground">
          Try adding more categories for a bigger selection, or browse what you liked.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            to="/categories"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Add categories
          </Link>
          <Link
            to="/liked"
            className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            See liked items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-visible">
      {/* Cat paws reaching from edges */}
      <CatPaw side="right" progress={dragProgress > 0 ? dragProgress : 0} />
      <CatPaw side="left" progress={dragProgress < 0 ? Math.abs(dragProgress) : 0} />

      <AnimatePresence mode="popLayout">
        {visible
          .slice()
          .reverse()
          .map((product) => {
            const si = visible.indexOf(product);
            const isTop = si === 0;
            return (
              <SwipeCard
                key={product.id}
                product={product}
                isTop={isTop}
                stackIndex={si}
                onSwipe={handle}
                dragProgress={isTop ? 0 : dragProgress}
                onDragProgress={isTop ? setDragProgress : undefined}
                isDailyDrop={isDailyDrop}
              />
            );
          })}
      </AnimatePresence>
    </div>
  );
}

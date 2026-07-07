import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { buildBuyUrl, type Product } from "@/lib/products";
import { haptic } from "@/lib/haptics";
import { getSocialProofCount, formatLikeCount } from "@/lib/social-proof";

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
export function SwipeCard({
  product,
  onSwipe,
  isTop,
  stackIndex,
  dragProgress, // 0→1 from the top card, drives background card reveal
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
  });

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
  }, [isTop]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g.active || g.committed || e.pointerId !== g.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const dist = Math.hypot(dx, dy);
    if (dist > g.maxDist) g.maxDist = dist;

    // Set card position directly — no middleware, no internal state
    x.set(dx);
    y.set(dy * 0.3); // dampen vertical movement

    // Report drag progress to parent for background card reveal
    if (onDragProgress) {
      onDragProgress(Math.min(1, Math.abs(dx) / FLY_OFF_DISTANCE));
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

    // Mid-drag commit: if velocity is high enough, commit immediately
    if (Math.abs(g.velocityX) > SWIPE_COMMIT_VELOCITY && Math.abs(dx) > 30) {
      commitSwipe(g.velocityX > 0 ? "like" : "pass");
    }
  }, [x, y, commitSwipe]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (e.pointerId !== g.pointerId) return;
    if (g.committed) return;

    g.active = false;

    const dx = e.clientX - g.startX;
    const elapsed = performance.now() - g.startTime;

    // Check if this was a tap (not a drag)
    if (g.maxDist < 10 && elapsed < 250) {
      // It's a tap — open the product
      window.open(buildBuyUrl(product), "_blank", "noopener,noreferrer");
      return;
    }

    // Check if swipe should commit (by distance or velocity)
    if (dx > SWIPE_COMMIT_DISTANCE || g.velocityX > SWIPE_COMMIT_VELOCITY) {
      commitSwipe("like");
    } else if (dx < -SWIPE_COMMIT_DISTANCE || g.velocityX < -SWIPE_COMMIT_VELOCITY) {
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
    // Snap back on cancel
    animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
    animate(y, 0, { type: "spring", stiffness: 500, damping: 35 });
  }, [x, y]);

  // Background card transforms — simple CSS driven by dragProgress prop (0→1)
  const bgScale = 1 - stackIndex * 0.04 + dragProgress * 0.04;
  const bgYOffset = stackIndex * 10 - dragProgress * 10;
  const bgOpacityVal = 0.85 + dragProgress * 0.15;

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
          className="absolute inset-0 h-full w-full object-contain p-4"
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

        {/* Daily Drop badge — top-left corner with wiggle */}
        {isDailyDrop && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              rotate: [0, -3, 3, -3, 3, 0],
              scale: [1, 1.05, 1.05, 1.05, 1.05, 1],
              opacity: 1,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 2.5,
              delay: 0.5,
            }}
            className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white shadow-md"
          >
            ✨ Daily Drop
          </motion.span>
        )}

        <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
          {/* Golden "Top Pick" badge — only shown on top-rated products */}
          {isGolden && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                rotate: [0, -2, 2, -2, 2, 0],
                scale: [1, 1.05, 1.05, 1.05, 1.05, 1],
                opacity: 1,
              }}
              transition={{
                duration: 0.45,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1.5,
                delay: 1,
              }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-amber-900 shadow-md"
            >
              ⭐ TOP PICK
            </motion.span>
          )}
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {product.category}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
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
            <div className="mt-2 flex items-center gap-1.5">
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
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* Social proof badge — always shown */}
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur">
              <svg viewBox="0 0 20 20" fill="#f87171" className="h-3 w-3" aria-hidden="true">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="text-[11px] font-semibold text-white">{likeCountStr} swipers liked this</span>
            </div>
            {isTop && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                Tap card to view on Amazon
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
  premarkWindow = 3,
  isDailyDrop = false,
}: {
  products: Product[];
  onAction: (product: Product, action: Action) => void;
  onVisibleIds?: (ids: string[]) => void;
  premarkWindow?: number;
  isDailyDrop?: boolean;
}) {
  const [index, setIndex] = useState(0);
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
    setIndex((i) => i + 1);
  }, [products, index, onAction]);

  if (index >= products.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-5xl">✨</div>
        <h3 className="text-xl font-bold">You're all caught up</h3>
        <p className="text-sm text-muted-foreground">
          Check back later for fresh picks, or browse what you liked.
        </p>
        <Link
          to="/liked"
          className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          See liked items
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
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

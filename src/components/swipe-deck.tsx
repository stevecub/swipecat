import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  useVelocity,
  animate,
  MotionValue,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import { buildBuyUrl, type Product } from "@/lib/products";
import { haptic } from "@/lib/haptics";

type Action = "like" | "pass";

/**
 * Thresholds for committing a swipe.
 * A swipe is committed when EITHER threshold is crossed — whichever comes first.
 * This matches how Tinder and Hinge feel: a slow deliberate drag OR a quick flick.
 */
const SWIPE_OFFSET_THRESHOLD = 110; // px of displacement
const SWIPE_VELOCITY_THRESHOLD = 450; // px/s of horizontal velocity

/**
 * How far off-screen the card travels before the swipe action fires.
 */
const FLY_OFF_DISTANCE = 600; // px beyond the screen edge

/**
 * The top card exposes its absolute drag distance (0–FLY_OFF_DISTANCE) as a
 * shared MotionValue so background cards can respond in real time.
 * At 0 = resting; at 1 = fully committed / flying off.
 */

export function SwipeCard({
  product,
  onSwipe,
  isTop,
  stackIndex,
  dragProgress,        // 0→1 motion value from the top card (for background cards)
  onDragProgressRef,  // callback so SwipeDeck can read the top card's dragProgress
}: {
  product: Product;
  onSwipe: (action: Action) => void;
  isTop: boolean;
  stackIndex: number;
  dragProgress?: MotionValue<number>;
  onDragProgressRef?: (mv: MotionValue<number>) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xVelocity = useVelocity(x);

  // Expose this card's drag progress so the deck can pass it to background cards
  const myDragProgress = useMotionValue(0);
  useEffect(() => {
    if (isTop && onDragProgressRef) {
      onDragProgressRef(myDragProgress);
    }
  }, [isTop, onDragProgressRef, myDragProgress]);

  // Keep myDragProgress in sync with x (0 at rest → 1 at FLY_OFF_DISTANCE)
  useEffect(() => {
    if (!isTop) return;
    const unsub = x.on("change", (v) => {
      myDragProgress.set(Math.min(1, Math.abs(v) / FLY_OFF_DISTANCE));
    });
    return unsub;
  }, [isTop, x, myDragProgress]);

  // Rotate based on horizontal drag
  const rotate = useTransform(x, [-250, 0, 250], [-22, 0, 22]);

  // Tint overlays and stamp labels
  const likeOpacity = useTransform(x, [30, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -30], [1, 0]);

  // Background card: scale and opacity driven by the top card's drag progress.
  // At rest: slightly shrunk and dimmed. As top card moves: rises to full size.
  const bgScale = dragProgress
    ? useTransform(dragProgress, [0, 1], [1 - stackIndex * 0.04, 1 - (stackIndex - 1) * 0.04])
    : undefined;
  const bgY = dragProgress
    ? useTransform(dragProgress, [0, 1], [stackIndex * 10, (stackIndex - 1) * 10])
    : undefined;
  const bgOpacity = dragProgress
    ? useTransform(dragProgress, [0, 0.15], [0.85, 1])
    : undefined;

  // Track whether a swipe is in-flight
  const swipingRef = useRef(false);

  // Track pointer for tap vs drag detection
  const pointerRef = useRef<{
    startX: number;
    startY: number;
    startT: number;
    maxDist: number;
    dragging: boolean;
    blockedUntil: number;
  }>({ startX: 0, startY: 0, startT: 0, maxDist: 0, dragging: false, blockedUntil: 0 });

  /**
   * Commit a swipe: animate card flying off-screen, then fire onSwipe.
   */
  const commitSwipe = (direction: Action, currentVx: number) => {
    if (swipingRef.current) return;
    swipingRef.current = true;

    void haptic(direction === "like" ? "success" : "light");

    const sign = direction === "like" ? 1 : -1;
    const targetX = sign * FLY_OFF_DISTANCE;

    // Slight vertical arc based on where on the card the drag started
    const cardEl = document.getElementById(`swipe-card-${product.id}`);
    let targetY = 0;
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const relY = pointerRef.current.startY - rect.top;
      const midY = rect.height / 2;
      targetY = ((relY - midY) / midY) * 80;
    }

    // Duration based on release velocity — faster flick = shorter duration
    const absVx = Math.abs(currentVx);
    const duration = absVx > SWIPE_VELOCITY_THRESHOLD
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

    // Drive drag progress to 1 so background card finishes its reveal
    animate(myDragProgress, 1, { type: "tween", duration });
  };

  return (
    <motion.div
      id={`swipe-card-${product.id}`}
      className={isTop ? "absolute inset-0 cursor-grab active:cursor-grabbing" : "absolute inset-0"}
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : bgY ?? stackIndex * 10,
        rotate: isTop ? rotate : 0,
        scale: isTop ? 1 : bgScale ?? (1 - stackIndex * 0.04),
        opacity: isTop ? 1 : bgOpacity ?? 1,
        zIndex: 10 - stackIndex,
        touchAction: isTop ? "none" : "auto",
      }}
      initial={false}
      // Only use framer-motion animate for non-top cards when NOT driven by motion values
      animate={!isTop && !dragProgress ? {
        scale: 1 - stackIndex * 0.04,
        y: stackIndex * 10,
        opacity: 1,
      } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={isTop ? "x" : false}
      dragElastic={1}
      onPointerDown={(e) => {
        if (!isTop) return;
        pointerRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startT: performance.now(),
          maxDist: 0,
          dragging: false,
          blockedUntil: pointerRef.current.blockedUntil,
        };
      }}
      onPointerMove={(e) => {
        if (!isTop) return;
        const p = pointerRef.current;
        const d = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        if (d > p.maxDist) p.maxDist = d;
      }}
      onDragStart={() => {
        pointerRef.current.dragging = true;
      }}
      onDrag={() => {
        if (!isTop || swipingRef.current) return;
        // Velocity-triggered swipe: commit mid-drag if flick is fast enough
        const vx = xVelocity.get();
        const currentX = x.get();
        if (Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD && Math.abs(currentX) > 30) {
          commitSwipe(vx > 0 ? "like" : "pass", vx);
        }
      }}
      onDragEnd={(_, info) => {
        if (!isTop || swipingRef.current) return;
        pointerRef.current.dragging = false;
        pointerRef.current.blockedUntil = performance.now() + 350;

        const offsetX = info.offset.x;
        const vx = xVelocity.get();

        if (offsetX > SWIPE_OFFSET_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD) {
          commitSwipe("like", vx);
        } else if (offsetX < -SWIPE_OFFSET_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD) {
          commitSwipe("pass", vx);
        } else {
          // Not enough — spring back to center and reset drag progress
          animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
          animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
          animate(myDragProgress, 0, { type: "spring", stiffness: 400, damping: 30 });
        }
      }}
      onPointerUp={(e) => {
        if (!isTop) return;
        const p = pointerRef.current;
        const now = performance.now();
        if (p.dragging) return;
        if (now < p.blockedUntil) return;
        const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        const duration = now - p.startT;
        if (dist > 10 || p.maxDist > 10 || duration > 250) return;
        window.open(buildBuyUrl(product), "_blank", "noopener,noreferrer");
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-card shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] ring-1 ring-border">
        <img
          src={product.image}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-contain p-4"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

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

        <div className="absolute right-4 top-4">
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
          {isTop && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              Tap card to view on Amazon
            </div>
          )}
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
}: {
  products: Product[];
  onAction: (product: Product, action: Action) => void;
  onVisibleIds?: (ids: string[]) => void;
  premarkWindow?: number;
}) {
  const [index, setIndex] = useState(0);
  const visible = useMemo(() => products.slice(index, index + premarkWindow), [products, index, premarkWindow]);

  // Shared drag progress from the top card — passed to background cards so they
  // can smoothly scale/fade in as the top card is dragged away
  const topDragProgressRef = useRef<MotionValue<number> | null>(null);
  // We use a stable MotionValue as a proxy so background cards can subscribe
  const sharedDragProgress = useMotionValue(0);

  const handleDragProgressRef = (mv: MotionValue<number>) => {
    topDragProgressRef.current = mv;
    // Bridge: whenever the top card's progress changes, update the shared value
    mv.on("change", (v) => sharedDragProgress.set(v));
  };

  // Reset shared progress when the index advances
  useEffect(() => {
    sharedDragProgress.set(0);
  }, [index, sharedDragProgress]);

  const prevVisibleKey = useRef<string>("");
  useEffect(() => {
    if (!onVisibleIds || visible.length === 0) return;
    const key = visible.map((p) => p.id).join(",");
    if (key === prevVisibleKey.current) return;
    prevVisibleKey.current = key;
    onVisibleIds(visible.map((p) => p.id));
  }, [visible, onVisibleIds]);

  const handle = (action: Action) => {
    const current = products[index];
    if (!current) return;
    onAction(current, action);
    setIndex((i) => i + 1);
  };

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
      <AnimatePresence>
        {visible
          .slice()
          .reverse()
          .map((product) => {
            const stackIndex = visible.indexOf(product);
            const isTop = stackIndex === 0;
            return (
              <SwipeCard
                key={product.id}
                product={product}
                isTop={isTop}
                stackIndex={stackIndex}
                onSwipe={handle}
                // Top card registers its drag progress; background cards receive it
                onDragProgressRef={isTop ? handleDragProgressRef : undefined}
                dragProgress={!isTop ? sharedDragProgress : undefined}
              />
            );
          })}
      </AnimatePresence>
    </div>
  );
}

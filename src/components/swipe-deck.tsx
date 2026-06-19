import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, X, Bookmark } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { buildBuyUrl, type Product } from "@/lib/products";

type Action = "like" | "pass" | "save";

export function SwipeCard({
  product,
  onSwipe,
  isTop,
  stackIndex,
}: {
  product: Product;
  onSwipe: (action: Action) => void;
  isTop: boolean;
  stackIndex: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -40], [1, 0]);

  // Track pointer to distinguish real taps from drags / slow swipes
  const pointerRef = useRef<{
    startX: number;
    startY: number;
    startT: number;
    maxDist: number;
    dragging: boolean;
    blockedUntil: number;
  }>({ startX: 0, startY: 0, startT: 0, maxDist: 0, dragging: false, blockedUntil: 0 });

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - stackIndex,
      }}
      initial={false}
      animate={{
        scale: 1 - stackIndex * 0.04,
        y: stackIndex * 10,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onPointerDown={(e) => {
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
        const p = pointerRef.current;
        const d = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        if (d > p.maxDist) p.maxDist = d;
      }}
      onDragStart={() => {
        pointerRef.current.dragging = true;
      }}
      onDragEnd={(_, info) => {
        pointerRef.current.dragging = false;
        // Block taps for 350ms after any drag to prevent stray click-through
        pointerRef.current.blockedUntil = performance.now() + 350;
        if (info.offset.x > 120) onSwipe("like");
        else if (info.offset.x < -120) onSwipe("pass");
      }}
      onPointerUp={(e) => {
        if (!isTop) return;
        const p = pointerRef.current;
        const now = performance.now();
        if (p.dragging) return;
        if (now < p.blockedUntil) return;
        const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        const duration = now - p.startT;
        // Real tap: barely moved, quick press, no drag was started
        if (dist > 10 || p.maxDist > 10 || duration > 250) return;
        window.open(buildBuyUrl(product), "_blank", "noopener,noreferrer");
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-card shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] ring-1 ring-border">
        <img
          src={product.image}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-cover"
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

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold leading-tight">{product.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-white/85">{product.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-2xl font-black">${product.price}</div>
            </div>
          </div>
          {isTop && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
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
}: {
  products: Product[];
  onAction: (product: Product, action: Action) => void;
}) {
  const [index, setIndex] = useState(0);
  const visible = useMemo(() => products.slice(index, index + 3), [products, index]);

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
          Check back later for fresh picks — or browse what you saved.
        </p>
        <Link
          to="/saved"
          className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          See saved items
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
            return (
              <SwipeCard
                key={product.id}
                product={product}
                isTop={stackIndex === 0}
                stackIndex={stackIndex}
                onSwipe={handle}
              />
            );
          })}
      </AnimatePresence>

      <ActionBar onAction={handle} />
    </div>
  );
}

function ActionBar({ onAction }: { onAction: (a: Action) => void }) {
  const btn =
    "flex items-center justify-center rounded-full shadow-lg ring-1 ring-border bg-card transition active:scale-90";
  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-2 z-20 flex translate-y-full items-center justify-center gap-5 pt-6">
      <button
        aria-label="Pass"
        onClick={() => onAction("pass")}
        className={`${btn} pointer-events-auto h-14 w-14 text-[var(--color-pass)]`}
      >
        <X className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <button
        aria-label="Save for later"
        onClick={() => onAction("save")}
        className={`${btn} pointer-events-auto h-12 w-12 text-[var(--color-save)]`}
      >
        <Bookmark className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <button
        aria-label="Like"
        onClick={() => onAction("like")}
        className={`${btn} pointer-events-auto h-14 w-14 text-[var(--color-like)]`}
      >
        <Heart className="h-7 w-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}

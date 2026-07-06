/**
 * Onboarding.tsx
 *
 * 3-screen first-launch experience for SwipeCat.
 *
 * Screen 1 — "The Hook": Hero card springs in, shimmer sweeps, bold copy.
 * Screen 2 — "The Mechanic": Auto-animated swipe demo with confetti burst.
 * Screen 3 — "The Commitment": Category picker (min 3), then launch.
 *
 * Psychology:
 *  - Screen 1: Anticipation + visual delight before any effort is required.
 *  - Screen 2: Demonstrates the reward loop (like = confetti = dopamine).
 *  - Screen 3: IKEA effect — micro-investment creates ownership and retention.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import confetti from "canvas-confetti";
import { Check } from "lucide-react";
import { CATEGORIES, saveSelectedCategories } from "@/lib/categories";

const ONBOARDING_KEY = "swipecat:onboarded:v1";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "true";
}

function markOnboardingComplete() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "true");
}

interface OnboardingProps {
  onComplete: () => void;
}

// ─── Screen 1: The Hook ──────────────────────────────────────────────────────

function ScreenHook({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="screen-hook"
      className="flex h-full flex-col items-center justify-between px-6 pb-10 pt-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35 }}
    >
      {/* Hero card */}
      <motion.div
        className="relative w-full max-w-[300px] overflow-hidden rounded-[2rem] shadow-[0_24px_60px_-10px_rgba(0,0,0,0.3)]"
        style={{ aspectRatio: "3/4" }}
        initial={{ y: 80, rotate: -4, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, rotate: -2, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
      >
        <img
          src="/onboarding-hero.jpg"
          alt="A beautiful desk lamp"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 1.8, delay: 0.8 }}
        />

        {/* Category badge */}
        <motion.div
          className="absolute right-3 top-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            Home Decor
          </span>
        </motion.div>

        {/* Social proof badge */}
        <motion.div
          className="absolute left-3 top-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-amber-900 shadow-md">
            ⭐ TOP PICK
          </span>
        </motion.div>

        {/* Card info */}
        <motion.div
          className="absolute inset-x-0 bottom-0 p-4 text-white"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <p className="text-sm font-bold leading-tight">
            Minimalist Adjustable Desk Lamp
          </p>
          <p className="mt-0.5 text-lg font-black">$34.99</p>
          <div className="mt-1.5 flex items-center gap-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur">
              <svg viewBox="0 0 20 20" fill="#f87171" className="h-3 w-3">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="text-[11px] font-semibold">2.4k swipers liked this</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Copy */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <h1 className="text-3xl font-black leading-tight tracking-tight">
          Your next favorite thing<br />is one swipe away.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Hand-picked products. Zero scrolling. Pure discovery.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={onNext}
        className="mt-8 w-full max-w-xs rounded-full bg-primary py-4 text-base font-black text-primary-foreground shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 20 }}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.03 }}
      >
        Let's go 🐱
      </motion.button>
    </motion.div>
  );
}

// ─── Screen 2: The Mechanic ──────────────────────────────────────────────────

const DEMO_PRODUCTS = [
  {
    title: "Wireless Noise-Cancelling Headphones",
    price: "$79.99",
    category: "Electronics",
    color: "bg-indigo-100",
    emoji: "🎧",
  },
  {
    title: "Stainless Steel Water Bottle",
    price: "$24.99",
    category: "Fitness",
    color: "bg-teal-100",
    emoji: "💧",
  },
];

function DemoCard({
  product,
  swipeDir,
  onAnimationComplete,
}: {
  product: (typeof DEMO_PRODUCTS)[0];
  swipeDir: "like" | "pass" | null;
  onAnimationComplete?: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, -20], [1, 0]);

  useEffect(() => {
    if (swipeDir === "like") {
      animate(x, 400, {
        type: "spring",
        stiffness: 200,
        damping: 25,
        onComplete: onAnimationComplete,
      });
    } else if (swipeDir === "pass") {
      animate(x, -400, {
        type: "spring",
        stiffness: 200,
        damping: 25,
        onComplete: onAnimationComplete,
      });
    }
  }, [swipeDir, x, onAnimationComplete]);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
    >
      <div className={`relative h-full w-full overflow-hidden rounded-[2rem] ${product.color} shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] ring-1 ring-border`}>
        {/* Emoji placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[100px]">{product.emoji}</span>
        </div>

        {/* Like tint */}
        <motion.div
          className="absolute inset-0 rounded-[2rem] bg-green-400/30"
          style={{ opacity: likeOpacity }}
        />
        {/* Pass tint */}
        <motion.div
          className="absolute inset-0 rounded-[2rem] bg-red-400/30"
          style={{ opacity: passOpacity }}
        />

        {/* LIKE stamp */}
        <motion.div
          className="absolute left-5 top-10 rotate-[-20deg] rounded-xl border-4 border-green-500 px-3 py-1"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-2xl font-black text-green-500">LIKE</span>
        </motion.div>

        {/* PASS stamp */}
        <motion.div
          className="absolute right-5 top-10 rotate-[20deg] rounded-xl border-4 border-red-500 px-3 py-1"
          style={{ opacity: passOpacity }}
        >
          <span className="text-2xl font-black text-red-500">PASS</span>
        </motion.div>

        {/* Category badge */}
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {product.category}
          </span>
        </div>

        {/* Card info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
          <p className="text-sm font-bold leading-tight">{product.title}</p>
          <p className="mt-0.5 text-lg font-black">{product.price}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ScreenMechanic({ onNext }: { onNext: () => void }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"like" | "pass" | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const confettiFiredRef = useRef(false);

  const fireConfetti = useCallback(() => {
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5, x: 0.5 },
      colors: ["#E5306B", "#ff6b9d", "#ffd700", "#7c3aed", "#10b981"],
      scalar: 1.1,
    });
  }, []);

  // Auto-play sequence
  useEffect(() => {
    // Step 1: swipe card 1 right (LIKE) at 1.0s
    const t1 = setTimeout(() => {
      setSwipeDir("like");
    }, 1000);

    // Step 2: fire confetti at 1.4s (while card is mid-swipe)
    const t2 = setTimeout(() => {
      fireConfetti();
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fireConfetti]);

  const handleCard1Done = useCallback(() => {
    setCardIndex(1);
    setSwipeDir(null);
    // Step 3: swipe card 2 left (PASS) at 1.0s after it appears
    setTimeout(() => setSwipeDir("pass"), 1000);
    // Step 4: show copy
    setTimeout(() => setShowCopy(true), 2200);
    // Step 5: show button
    setTimeout(() => setShowButton(true), 2800);
  }, []);

  return (
    <motion.div
      key="screen-mechanic"
      className="flex h-full flex-col items-center justify-between px-6 pb-10 pt-12"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35 }}
    >
      {/* Card demo area */}
      <div className="relative mx-auto w-full max-w-[280px]" style={{ aspectRatio: "3/4.2" }}>
        <AnimatePresence>
          {cardIndex === 0 && (
            <motion.div
              key="card-0"
              className="absolute inset-0"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <DemoCard
                product={DEMO_PRODUCTS[0]}
                swipeDir={swipeDir}
                onAnimationComplete={handleCard1Done}
              />
            </motion.div>
          )}
          {cardIndex === 1 && (
            <motion.div
              key="card-1"
              className="absolute inset-0"
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
            >
              <DemoCard
                product={DEMO_PRODUCTS[1]}
                swipeDir={swipeDir}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Copy */}
      <AnimatePresence>
        {showCopy && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-black leading-snug tracking-tight">
              Swipe right to save it.<br />Swipe left to skip it.
            </h2>
            <p className="mt-2 text-base text-muted-foreground">That's literally it.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {showButton && (
          <motion.button
            onClick={onNext}
            className="mt-6 w-full max-w-xs rounded-full bg-primary py-4 text-base font-black text-primary-foreground shadow-lg"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.03 }}
          >
            Got it →
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip */}
      <button
        onClick={onNext}
        className="absolute right-5 top-5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground"
      >
        Skip
      </button>
    </motion.div>
  );
}

// ─── Screen 3: The Commitment ────────────────────────────────────────────────

function ScreenCategories({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [shakeButton, setShakeButton] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleLaunch = () => {
    if (selected.length < 3) {
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 600);
      return;
    }
    saveSelectedCategories(selected);
    markOnboardingComplete();
    onComplete();
  };

  const canLaunch = selected.length >= 3;

  return (
    <motion.div
      key="screen-categories"
      className="flex h-full flex-col px-5 pb-8 pt-10"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <motion.div
        className="mb-5 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-black tracking-tight">What are you into?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {selected.length < 3
            ? `Pick at least ${3 - selected.length} more to personalize your feed.`
            : `${selected.length} selected — looking good! 🔥`}
        </p>
      </motion.div>

      {/* Category grid */}
      <div className="flex-1 overflow-y-auto">
        <ul className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c, i) => {
            const active = selected.includes(c.id);
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, scale: 0.8, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.15 + i * 0.055,
                  type: "spring",
                  stiffness: 320,
                  damping: 22,
                }}
              >
                <motion.button
                  onClick={() => toggle(c.id)}
                  aria-pressed={active}
                  className={`relative flex w-full flex-col items-start gap-2 rounded-2xl p-4 text-left transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card ring-1 ring-border"
                  }`}
                  whileTap={{ scale: 0.94 }}
                  animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="text-3xl">{c.emoji}</span>
                  <span className="text-sm font-semibold leading-tight">{c.label}</span>
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-primary"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* CTA */}
      <motion.div
        className="mt-5"
        animate={shakeButton ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.button
          onClick={handleLaunch}
          className={`w-full rounded-full py-4 text-base font-black shadow-lg transition-colors ${
            canLaunch
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          animate={canLaunch ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          whileTap={{ scale: 0.96 }}
        >
          {canLaunch ? "Show me the good stuff 🔥" : `Pick ${3 - selected.length} more to continue`}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Progress Dots ───────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="h-1.5 rounded-full bg-foreground/30"
          animate={{
            width: i === step ? 20 : 6,
            backgroundColor: i === step ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.25)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      ))}
    </div>
  );
}

// ─── Root Onboarding Component ───────────────────────────────────────────────

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const next = useCallback(() => setStep((s) => s + 1), []);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative h-full w-full overflow-hidden">
        <ProgressDots step={step} total={3} />

        <AnimatePresence mode="wait">
          {step === 0 && <ScreenHook key="hook" onNext={next} />}
          {step === 1 && <ScreenMechanic key="mechanic" onNext={next} />}
          {step === 2 && <ScreenCategories key="categories" onComplete={onComplete} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

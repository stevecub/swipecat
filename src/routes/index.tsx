import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Onboarding, hasCompletedOnboarding } from "@/components/onboarding";
import { SwipeDeck } from "@/components/swipe-deck";
import { SwipeHints } from "@/components/swipe-hints";
import { SwipeCounters } from "@/components/swipe-counters";
import { StreakBadge } from "@/components/streak-badge";
import { LevelProgress } from "@/components/level-progress";
import { LevelUpCelebration } from "@/components/level-up-celebration";
import { DailyDropBanner } from "@/components/daily-drop-banner";
import { DailyDropComplete } from "@/components/daily-drop-complete";
import { SharePrompt, useSharePrompt } from "@/components/share-prompt";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineState } from "@/components/offline-state";
import { getProducts, type Product } from "@/lib/products";
import { cacheProducts } from "@/lib/product-cache";
import { useProductLists } from "@/hooks/use-product-lists";
import { useCategories } from "@/hooks/use-categories";
import { useSeen } from "@/hooks/use-seen";
import { useNetwork } from "@/hooks/use-network";
import { useStreak } from "@/hooks/use-streak";
import { usePersonalization } from "@/hooks/use-personalization";
import { useLevel } from "@/hooks/use-level";
import { useDailyDrop } from "@/hooks/use-daily-drop";
import { productMatchesCategories } from "@/lib/categories";
import { claimDeferredLink } from "@/lib/deferred-links";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwipeCat — Discover products you'll love" },
      {
        name: "description",
        content:
          "Swipe through hand-picked products. Right to like, left to pass.",
      },
      { property: "og:title", content: "SwipeCat — Discover products you'll love" },
      {
        property: "og:description",
        content: "A Tinder-style way to discover great products on your phone.",
      },
    ],
  }),
  component: Discover,
});

/** Fisher-Yates shuffle — returns a new shuffled array without mutating the original */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trigger a background refresh when this many cards remain in the queue */
const REFETCH_THRESHOLD = 20;
const PREMARK_WINDOW = 3;

function Discover() {
  // ─── Onboarding gate ─────────────────────────────────────────────────────────
  const [onboarded, setOnboarded] = useState<boolean>(() => hasCompletedOnboarding());

  const handleOnboardingComplete = useCallback(() => {
    setOnboarded(true);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const fetchingRef = useRef(false);

  const { lists, like, pass, clearLiked, clearPassed } = useProductLists();
  const { selected } = useCategories();
  const { seenSet, markSeen } = useSeen();
  const { isOnline } = useNetwork();
  const { streakCount, isAtRisk, recordSwipe } = useStreak();
  const { recordLike, recordPass, weightedSort } = usePersonalization();
  const { levelInfo, justLeveledUp, recordSwipeForLevel, dismissLevelUp } = useLevel();

  // ─── Daily Drop ─────────────────────────────────────────────────────────────
  const { dailyProducts, hasNewDrop, isDropCompleted, markSeen: markDropSeen, markCompleted: markDropCompleted } = useDailyDrop(rawProducts);
  const [dailyDropActive, setDailyDropActive] = useState(false);
  const [dropSwipeCount, setDropSwipeCount] = useState(0);
  const [showDropComplete, setShowDropComplete] = useState(false);
  const [dropDismissed, setDropDismissed] = useState(false);

  // How many daily drop products the user hasn't swiped yet in this session
  const dropRemaining = Math.max(0, dailyProducts.length - dropSwipeCount);

  const handleActivateDrop = useCallback(() => {
    setDailyDropActive(true);
    setDropSwipeCount(0);
    markDropSeen();
  }, [markDropSeen]);

  const handleDeactivateDrop = useCallback(() => {
    setDailyDropActive(false);
  }, []);

  const handleDropComplete = useCallback(() => {
    setShowDropComplete(false);
    setDailyDropActive(false);
  }, []);

  const handleDismissDrop = useCallback(() => {
    setDropDismissed(true);
    setDailyDropActive(false);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Share Prompt ───────────────────────────────────────────────────────────
  const { promptProduct, onLike: onLikeForShare, dismiss: dismissSharePrompt } = useSharePrompt();
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Deferred Link Claim (first launch) ─────────────────────────────────────
  const [deferredProductId, setDeferredProductId] = useState<string | null>(null);

  // Runs on mount AND when onboarding completes (onboarded flips true).
  // claimDeferredLink() internally checks that onboarding is done + no prior
  // claim exists, so it's safe to call multiple times — it no-ops if not first launch.
  useEffect(() => {
    if (!onboarded) return;
    claimDeferredLink().then((productId) => {
      if (productId) setDeferredProductId(productId);
    });
  }, [onboarded]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Stable queue ────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Product[]>([]);
  const queueBuiltRef = useRef(false);
  const excludeAtBuildRef = useRef<Set<string>>(new Set());

  // Build (or rebuild) the queue when raw products or selected categories change.
  useEffect(() => {
    if (rawProducts.length === 0) return;

    const excludeSet = new Set([...seenSet, ...lists.liked, ...lists.passed]);
    excludeAtBuildRef.current = excludeSet;

    const base = rawProducts.filter(
      (p) => !excludeSet.has(p.id) && productMatchesCategories(p.category, selected),
    );
    let sorted = weightedSort(base);

    // If a deferred link was claimed, move that product to the front
    if (deferredProductId) {
      const deferredProduct = rawProducts.find(
        (p) => p.asin === deferredProductId || p.id === deferredProductId,
      );
      if (deferredProduct) {
        sorted = [deferredProduct, ...sorted.filter((p) => p.id !== deferredProduct.id)];
      }
      setDeferredProductId(null); // Only boost once
    }

    setQueue(sorted);
    queueBuiltRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawProducts, selected, deferredProductId]);
  // ─────────────────────────────────────────────────────────────────────────────

  // Load products on mount
  const loadProducts = useCallback(() => {
    setLoadFailed(false);
    getProducts()
      .then((data) => {
        if (data.length > 0) {
          setRawProducts(data);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
      })
      .catch(() => {
        setLoadFailed(true);
      });
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-retry when connection comes back and we have no products
  useEffect(() => {
    if (isOnline && (rawProducts.length === 0 || loadFailed)) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Auto-refresh: when fewer than REFETCH_THRESHOLD cards remain in the queue
  const queueLengthRef = useRef(queue.length);
  queueLengthRef.current = queue.length;

  useEffect(() => {
    if (queue.length < REFETCH_THRESHOLD && !fetchingRef.current && rawProducts.length > 0) {
      fetchingRef.current = true;
      getProducts().then((fresh) => {
        setRawProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = fresh.filter((p) => !existingIds.has(p.id));
          fetchingRef.current = false;
          if (newOnes.length > 0) {
            const exclude = excludeAtBuildRef.current;
            const toAdd = newOnes.filter(
              (p) => !exclude.has(p.id) && productMatchesCategories(p.category, selected),
            );
            if (toAdd.length > 0) {
              setQueue((q) => [...q, ...weightedSort(toAdd)]);
            }
            return [...prev, ...newOnes];
          }
          return prev;
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  const handleAction = (product: Product, action: "like" | "pass") => {
    cacheProducts(product);
    if (action === "like") {
      like(product.id);
      recordLike(product);
      onLikeForShare(product);
    } else {
      pass(product.id);
      recordPass(product);
    }
    setSwipeCount((prev) => prev + 1);
    recordSwipe();
    recordSwipeForLevel();
    excludeAtBuildRef.current.add(product.id);

    // Track daily drop progress
    if (dailyDropActive) {
      const newDropCount = dropSwipeCount + 1;
      setDropSwipeCount(newDropCount);
      // Trigger completion celebration when all drop products are swiped
      if (newDropCount >= dailyProducts.length && dailyProducts.length > 0) {
        markDropCompleted(); // persist completion so banner stays hidden
        setTimeout(() => setShowDropComplete(true), 400);
      }
    }
  };

  const handleVisibleIds = (ids: string[]) => {
    markSeen(ids);
  };

  const showOfflineState = rawProducts.length === 0 && (!isOnline || loadFailed);

  // Determine which products to show in the deck.
  // In daily drop mode we pass the FULL dailyProducts array and let the
  // SwipeDeck's own internal index advance naturally. The dropSwipeCount
  // state is only used for the banner counter and completion trigger.
  const activeProducts = dailyDropActive ? dailyProducts : queue;

  // If onboarding hasn't been completed, render the onboarding flow
  if (!onboarded) {
    return (
      <AnimatePresence mode="wait">
        <Onboarding key="onboarding" onComplete={handleOnboardingComplete} />
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      className="flex h-[100dvh] flex-col bg-background overflow-hidden touch-none"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <OfflineBanner visible={!isOnline} />

      <header
        className="px-5 pb-2"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <SwipeCounters
          likeCount={lists.liked.length}
          passCount={lists.passed.length}
          onClearLiked={clearLiked}
          onClearPassed={clearPassed}
          brandingSlot={
            <div className="flex items-center gap-2">
              <img
                src="/icon-192.png"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <h1 className="text-xl font-black tracking-tight">SwipeCat</h1>
              <StreakBadge count={streakCount} isAtRisk={isAtRisk} />
            </div>
          }
        />
        {/* Level progress bar */}
        <LevelProgress levelInfo={levelInfo} />
        <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
          As an Amazon Associate we earn from qualifying purchases.{" "}
          <Link to="/about" className="underline">
            Learn more
          </Link>
        </p>
      </header>

      <main className="relative flex-1 px-5 pb-20">
        {/* Daily Drop banner — hidden once completed or manually dismissed */}
        {!isDropCompleted && !dropDismissed && (
          <DailyDropBanner
            hasNewDrop={hasNewDrop}
            isActive={dailyDropActive}
            dropCount={dailyProducts.length}
            remaining={dropRemaining}
            onActivate={handleActivateDrop}
            onDeactivate={handleDeactivateDrop}
            onDismiss={handleDismissDrop}
          />
        )}

        <div className="relative mx-auto aspect-[3/4.6] h-full max-h-[580px] w-full max-w-md">
          {showOfflineState ? (
            <OfflineState onRetry={loadProducts} />
          ) : activeProducts.length > 0 ? (
            <SwipeDeck
              products={activeProducts}
              onAction={handleAction}
              onVisibleIds={handleVisibleIds}
              premarkWindow={PREMARK_WINDOW}
              isDailyDrop={dailyDropActive}
            />
          ) : rawProducts.length > 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="text-5xl">🗂️</div>
              <h3 className="text-xl font-bold">No matches in this filter</h3>
              <p className="text-sm text-muted-foreground">
                Try adding more categories or clear the filter.
              </p>
              <Link
                to="/categories"
                className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Edit categories
              </Link>
            </div>
          ) : null}
          {!showOfflineState && <SwipeHints swipeCount={swipeCount} />}
        </div>
      </main>

      <BottomNav />

      {/* Share prompt overlay */}
      <SharePrompt product={promptProduct} onDismiss={dismissSharePrompt} />

      {/* Level-up celebration overlay */}
      <LevelUpCelebration
        visible={justLeveledUp}
        levelInfo={levelInfo}
        onDismiss={dismissLevelUp}
      />

      {/* Daily Drop complete celebration */}
      <DailyDropComplete
        visible={showDropComplete}
        onDismiss={handleDropComplete}
      />
    </motion.div>
  );
}

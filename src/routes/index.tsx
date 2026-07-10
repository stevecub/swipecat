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
import { ShareHint, useShareHint } from "@/components/share-prompt";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineState } from "@/components/offline-state";
import { getProducts, getProduct, type Product } from "@/lib/products";
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
import { saveQueueCache, loadQueueCache, clearQueueCache, categoriesHash } from "@/lib/queue-cache";

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

// (Deck position persistence is now handled by queue-cache.ts)

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
  const { recordLike, recordPass, weightedSort, resetScores } = usePersonalization();
  const { levelInfo, justLeveledUp, recordSwipeForLevel, dismissLevelUp } = useLevel();

  // ─── Daily Drop ─────────────────────────────────────────────────────────────
  const { dailyProducts, hasNewDrop, isDropCompleted, isDismissedToday, markSeen: markDropSeen, markCompleted: markDropCompleted, dismissForDay } = useDailyDrop(rawProducts);
  const [dailyDropActive, setDailyDropActive] = useState(false);
  const [dropSwipeCount, setDropSwipeCount] = useState(0);
  const [showDropComplete, setShowDropComplete] = useState(false);

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
    dismissForDay();
    setDailyDropActive(false);
  }, [dismissForDay]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Share Prompt ───────────────────────────────────────────────────────────
  const { showHint: showShareHint, onCardVisible: onCardVisibleForShare, dismissHint: dismissShareHint } = useShareHint();
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

  // ─── Stable queue with full cache ───────────────────────────────────────────────
  const [queue, setQueue] = useState<Product[]>([]);
  const queueBuiltRef = useRef(false);
  const excludeAtBuildRef = useRef<Set<string>>(new Set());

  // The initial index to pass to SwipeDeck. This is STATE (not a ref) so that
  // when the queue-cache restores a position, SwipeDeck re-renders with the
  // correct initialIndex and our useEffect inside SwipeDeck can sync to it.
  const [restoredIndex, setRestoredIndex] = useState(0);
  const cacheConsumedRef = useRef(false);

  // Reset personalization scores AND clear the queue cache when categories change.
  const prevSelectedRef = useRef<string[]>(selected);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    if (prev.length > 0 || selected.length > 0) {
      const changed = prev.length !== selected.length || prev.some((id) => !selected.includes(id));
      if (changed && prev.length > 0) {
        resetScores();
        clearQueueCache();
        cacheConsumedRef.current = true; // don't try to restore stale cache
      }
    }
    prevSelectedRef.current = selected;
  }, [selected, resetScores]);

  // Build (or rebuild) the queue when raw products or selected categories change.
  useEffect(() => {
    if (rawProducts.length === 0) return;

    const excludeSet = new Set([...lists.liked, ...lists.passed]);
    excludeAtBuildRef.current = excludeSet;

    // Try to restore from cache first (same categories, queue order preserved).
    const cached = loadQueueCache();
    const currentCatHash = categoriesHash(selected);

    console.log("[SwipeCat:queue-build] cache found:", !!cached,
      "| cacheConsumed:", cacheConsumedRef.current,
      "| cached catHash:", cached?.categoriesHash,
      "| current catHash:", currentCatHash,
      "| cached currentId:", cached?.currentId,
      "| cached queueIds count:", cached?.queueIds?.length);

    if (
      !cacheConsumedRef.current &&
      cached &&
      cached.categoriesHash === currentCatHash &&
      cached.queueIds.length > 0
    ) {
      // Rebuild the queue in the exact cached order using rawProducts as lookup.
      const productMap = new Map(rawProducts.map((p) => [p.id, p]));
      const restored: Product[] = [];
      for (const id of cached.queueIds) {
        const p = productMap.get(id);
        // Only include if the product still exists and hasn't been liked/passed
        if (p && !excludeSet.has(id)) {
          restored.push(p);
        }
      }

      if (restored.length > 0) {
        // Find the index of the product the user was looking at
        let foundCurrentId = false;
        if (cached.currentId) {
          const idx = restored.findIndex((p) => p.id === cached.currentId);
          if (idx >= 0) {
            foundCurrentId = true;
            setRestoredIndex(idx);
            console.log("[SwipeCat:queue-build] RESTORED currentId found at index:", idx);
          } else {
            // Safety net: currentId not in restored queue (possibly dropped from
            // the 200-row fetch window). Fetch it directly and splice it in.
            console.log("[SwipeCat:queue-build] currentId NOT in restored queue, fetching directly...");
            cacheConsumedRef.current = true;
            setQueue(restored);
            setRestoredIndex(0);
            queueBuiltRef.current = true;

            // Async fallback: fetch the missing product and splice it in
            getProduct(cached.currentId).then((product) => {
              if (product && !excludeSet.has(product.id)) {
                setQueue((prev) => {
                  // Find where it should go (beginning of the queue at the old position)
                  const alreadyExists = prev.findIndex((p) => p.id === product.id);
                  if (alreadyExists >= 0) {
                    // Already there (race condition), just restore index
                    setRestoredIndex(alreadyExists);
                    console.log("[SwipeCat:queue-build] fallback: product already in queue at:", alreadyExists);
                    return prev;
                  }
                  // Insert at position 0 and set index to 0
                  const updated = [product, ...prev];
                  setRestoredIndex(0);
                  console.log("[SwipeCat:queue-build] fallback: spliced missing product at index 0");
                  return updated;
                });
              } else {
                console.log("[SwipeCat:queue-build] fallback: could not fetch product, staying at index 0");
              }
            });
            return;
          }
        } else {
          setRestoredIndex(0);
        }
        console.log("[SwipeCat:queue-build] CACHE RESTORE success | foundCurrentId:", foundCurrentId,
          "| restoredIndex:", foundCurrentId ? restored.findIndex((p) => p.id === cached.currentId) : 0,
          "| restored queue length:", restored.length);
        setQueue(restored);
        queueBuiltRef.current = true;
        cacheConsumedRef.current = true;
        return;
      }
    }

    // No valid cache (or cache consumed) — build fresh queue.
    console.log("[SwipeCat:queue-build] NO CACHE RESTORE, building fresh queue");
    cacheConsumedRef.current = true;
    setRestoredIndex(0);

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
    // Notify share prompt of the top visible card for dwell-time tracking.
    // The first ID in the array is always the top (current) card.
    const topId = ids[0];
    if (topId) {
      onCardVisibleForShare(topId);
    } else {
      onCardVisibleForShare(null);
    }
  };

  // Persist the queue order + current product ID whenever the deck advances.
  // This is the key to restoring position after navigation.
  const handleDeckIndexChange = useCallback((newIndex: number) => {
    const currentProduct = queue[newIndex];
    saveQueueCache(
      queue.map((p) => p.id),
      currentProduct?.id ?? null,
      selected,
    );
  }, [queue, selected]);

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
      className="flex flex-col bg-background overflow-hidden touch-none"
      style={{ height: "100dvh" }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <OfflineBanner visible={!isOnline} />

      <header
        className="px-5 pb-2"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}
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
      </header>

      <main className="relative flex-1 min-h-0 px-5 pb-16">
        {/* Daily Drop banner — hidden once completed or manually dismissed */}
        {!isDropCompleted && !isDismissedToday && (
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

        <div className="relative mx-auto w-full max-w-md" style={{ height: "calc(100% - 0.5rem)" }}>
          {showOfflineState ? (
            <OfflineState onRetry={loadProducts} />
          ) : activeProducts.length > 0 ? (
            <SwipeDeck
              // Key forces a full remount when switching between Daily Drop and
              // normal Discover. Without this, the deck's internal index carries
              // over and Daily Drop can start mid-way through, running out early.
              key={dailyDropActive ? "daily-drop" : "discover"}
              products={activeProducts}
              onAction={handleAction}
              onVisibleIds={handleVisibleIds}
              premarkWindow={PREMARK_WINDOW}
              isDailyDrop={dailyDropActive}
              // Restore position when navigating back from Liked/Passed/Categories.
              // Only applies to the normal queue.
              initialIndex={dailyDropActive ? 0 : restoredIndex}
              onIndexChange={dailyDropActive ? undefined : handleDeckIndexChange}
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
      {/* BottomNav is position:fixed so it overlays the bottom of the screen */}

      {/* Share hint tooltip — teaches long-press to share */}
      <ShareHint visible={showShareHint} />

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

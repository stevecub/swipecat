import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { SwipeDeck } from "@/components/swipe-deck";
import { SwipeHints } from "@/components/swipe-hints";
import { SwipeCounters } from "@/components/swipe-counters";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineState } from "@/components/offline-state";
import { getProducts, type Product } from "@/lib/products";
import { cacheProducts } from "@/lib/product-cache";
import { useProductLists } from "@/hooks/use-product-lists";
import { useCategories } from "@/hooks/use-categories";
import { useSeen } from "@/hooks/use-seen";
import { useNetwork } from "@/hooks/use-network";
import { productMatchesCategories } from "@/lib/categories";

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
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const fetchingRef = useRef(false);

  const { lists, like, pass, clearLiked, clearPassed } = useProductLists();
  const { selected } = useCategories();
  const { seenSet, markSeen } = useSeen();
  const { isOnline } = useNetwork();

  // ─── Stable queue ────────────────────────────────────────────────────────────
  //
  // THE ROOT CAUSE OF THE LOCKUP was that `filtered` was recomputed (and
  // reshuffled) on every swipe because liked/passed IDs were in its dependency
  // array. Each new array reference caused SwipeDeck to receive new `products`
  // props, resetting its internal index to 0 and effectively restarting the deck.
  //
  // Fix: build the queue ONCE when rawProducts or selected categories change,
  // then only APPEND new items when a background refresh brings fresh products.
  // Liked/passed/seen items are excluded at queue-build time only — mid-session
  // swipes do NOT trigger a rebuild.
  //
  // The deck itself calls onAction which removes the card from the top of the
  // visible stack naturally via its own index counter.
  //
  const [queue, setQueue] = useState<Product[]>([]);
  const queueBuiltRef = useRef(false);

  // Snapshot of excluded IDs at the time the queue was built.
  // We use a ref so the queue-build effect doesn't re-run when liked/passed change.
  const excludeAtBuildRef = useRef<Set<string>>(new Set());

  // Build (or rebuild) the queue when raw products or selected categories change.
  // This does NOT depend on liked/passed/seen — those are captured once at build time.
  useEffect(() => {
    if (rawProducts.length === 0) return;

    // Capture current exclusions at build time
    const excludeSet = new Set([...seenSet, ...lists.liked, ...lists.passed]);
    excludeAtBuildRef.current = excludeSet;

    const base = rawProducts.filter(
      (p) => !excludeSet.has(p.id) && productMatchesCategories(p.category, selected),
    );
    setQueue(shuffle(base));
    queueBuiltRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawProducts, selected]);
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

  // Auto-refresh: when fewer than REFETCH_THRESHOLD cards remain in the queue,
  // fetch fresh products and APPEND only genuinely new ones — no reshuffle.
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
            // Also append new items to the live queue directly so the deck
            // doesn't need to rebuild — just gets more cards at the end.
            const exclude = excludeAtBuildRef.current;
            const toAdd = newOnes.filter(
              (p) => !exclude.has(p.id) && productMatchesCategories(p.category, selected),
            );
            if (toAdd.length > 0) {
              setQueue((q) => [...q, ...shuffle(toAdd)]);
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
    if (action === "like") like(product.id);
    else pass(product.id);
    setSwipeCount((prev) => prev + 1);
    // Also add to the build-time exclude set so if the queue ever rebuilds
    // (e.g. category change) this item stays excluded
    excludeAtBuildRef.current.add(product.id);
  };

  const handleVisibleIds = (ids: string[]) => {
    markSeen(ids);
  };

  const showOfflineState = rawProducts.length === 0 && (!isOnline || loadFailed);

  return (
    <div className="flex h-[100dvh] flex-col bg-background overflow-hidden touch-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
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
            </div>
          }
        />
        <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
          As an Amazon Associate we earn from qualifying purchases.{" "}
          <Link to="/about" className="underline">
            Learn more
          </Link>
        </p>
      </header>

      <main className="relative flex-1 px-5 pb-28">
        <div className="relative mx-auto aspect-[3/4.6] h-full max-h-[640px] w-full max-w-md">
          {showOfflineState ? (
            <OfflineState onRetry={loadProducts} />
          ) : queue.length > 0 ? (
            <SwipeDeck
              products={queue}
              onAction={handleAction}
              onVisibleIds={handleVisibleIds}
              premarkWindow={PREMARK_WINDOW}
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
    </div>
  );
}

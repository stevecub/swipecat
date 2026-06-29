import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { SwipeDeck } from "@/components/swipe-deck";
import { SwipeHints } from "@/components/swipe-hints";
import { SwipeCounters } from "@/components/swipe-counters";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineState } from "@/components/offline-state";
import { getProducts, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";
import { useCategories } from "@/hooks/use-categories";
import { useSeen } from "@/hooks/use-seen";
import { useNetwork } from "@/hooks/use-network";
import { productMatchesCategories, CATEGORIES } from "@/lib/categories";

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

/** Trigger a background refresh when this many unseen cards remain */
const REFETCH_THRESHOLD = 20;

/**
 * How many cards ahead of the current position to pre-mark as "seen".
 * Cards in the visible stack (top 3) are marked immediately so that if the
 * user navigates away and back, those cards are already excluded.
 */
const PREMARK_WINDOW = 3;

function Discover() {
  const [products, setProducts] = useState<Product[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const fetchingRef = useRef(false);

  const { lists, like, pass, clearLiked, clearPassed } = useProductLists();
  const { selected } = useCategories();
  const { seenSet, markSeen } = useSeen();
  const { isOnline } = useNetwork();

  // Load products on mount
  const loadProducts = useCallback(() => {
    setLoadFailed(false);
    getProducts()
      .then((data) => {
        if (data.length > 0) {
          setProducts(data);
          setLoadFailed(false);
        } else if (products.length === 0) {
          // Got empty result and we have nothing cached — likely offline
          setLoadFailed(true);
        }
      })
      .catch(() => {
        if (products.length === 0) setLoadFailed(true);
      });
  }, [products.length]);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-retry when connection comes back and we have no products
  useEffect(() => {
    if (isOnline && (products.length === 0 || loadFailed)) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Build a stable joined string of seen IDs so useMemo only re-runs when
  // the actual set of seen items changes, not on every render.
  const seenKey = useMemo(
    () => [...lists.liked, ...lists.passed].sort().join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists.liked.length, lists.passed.length],
  );

  // Build the filtered queue
  const filtered = useMemo(() => {
    const excludeSet = new Set([...seenSet, ...lists.liked, ...lists.passed]);
    const base = products.filter(
      (p) => !excludeSet.has(p.id) && productMatchesCategories(p.category, selected),
    );
    return shuffle(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selected, seenKey]);

  // Auto-refresh: when fewer than REFETCH_THRESHOLD unseen cards remain
  useEffect(() => {
    if (filtered.length < REFETCH_THRESHOLD && !fetchingRef.current && products.length > 0) {
      fetchingRef.current = true;
      getProducts().then((fresh) => {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = fresh.filter((p) => !existingIds.has(p.id));
          fetchingRef.current = false;
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      });
    }
  }, [filtered.length, products.length]);

  const handleAction = (product: Product, action: "like" | "pass") => {
    if (action === "like") like(product.id);
    else pass(product.id);
    setSwipeCount((prev) => prev + 1);
  };

  const handleVisibleIds = (ids: string[]) => {
    markSeen(ids);
  };

  // Determine if we should show the offline empty state:
  // Only when we have NO products loaded AND we're offline (or load failed)
  const showOfflineState = products.length === 0 && (!isOnline || loadFailed);

  return (
    <div className="flex h-[100dvh] flex-col bg-background overflow-hidden touch-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Offline banner — slides in at the top when offline, even if we have cached content */}
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
          ) : filtered.length > 0 ? (
            <SwipeDeck
              products={filtered}
              onAction={handleAction}
              onVisibleIds={handleVisibleIds}
              premarkWindow={PREMARK_WINDOW}
            />
          ) : products.length > 0 ? (
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

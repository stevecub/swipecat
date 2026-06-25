import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { SwipeDeck } from "@/components/swipe-deck";
import { SwipeHints } from "@/components/swipe-hints";
import { BottomNav } from "@/components/bottom-nav";
import { getProducts, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";
import { useCategories } from "@/hooks/use-categories";
import { productMatchesCategories, CATEGORIES } from "@/lib/categories";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwipeCat — Discover products you'll love" },
      {
        name: "description",
        content:
          "Swipe through hand-picked products. Right to like, left to pass, up to save for later.",
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

function Discover() {
  const [products, setProducts] = useState<Product[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const fetchingRef = useRef(false);

  const { lists, like, pass } = useProductLists();
  const { selected } = useCategories();

  // Load products on mount
  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  // Build a stable joined string of seen IDs so useMemo only re-runs when
  // the actual set of seen items changes, not on every render.
  const seenKey = useMemo(
    () => [...lists.liked, ...lists.passed].sort().join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists.liked.length, lists.passed.length],
  );

  // Filter by category AND exclude already-seen items, then shuffle so that
  // when multiple categories are selected the results are interleaved randomly
  // rather than appearing in database-insertion order (which groups by category).
  const filtered = useMemo(() => {
    const seenSet = new Set([...lists.liked, ...lists.passed]);
    const base = products.filter(
      (p) => !seenSet.has(p.id) && productMatchesCategories(p.category, selected),
    );
    return shuffle(base);
    // Use seenKey (a stable string) instead of seenIds (a new Set object each time)
    // so the shuffle only re-runs when the seen set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selected, seenKey]);

  // Auto-refresh: when fewer than REFETCH_THRESHOLD unseen cards remain,
  // silently fetch a fresh batch from Supabase and append any genuinely new
  // products (ones not already in the local pool).
  useEffect(() => {
    if (filtered.length < REFETCH_THRESHOLD && !fetchingRef.current && products.length > 0) {
      fetchingRef.current = true;
      getProducts().then((fresh) => {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = fresh.filter((p) => !existingIds.has(p.id));
          fetchingRef.current = false;
          // Only update state if there are actually new products to add
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      });
    }
  }, [filtered.length, products.length]);

  const activeLabels = selected
    .map((id) => CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean) as string[];

  const handleAction = (product: Product, action: "like" | "pass") => {
    if (action === "like") like(product.id);
    else pass(product.id);
    setSwipeCount((prev) => prev + 1);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background overflow-hidden touch-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <header
        className="px-5 pb-2"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          {/* SwipeCat branding: cat icon + wordmark */}
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
          {activeLabels.length > 0 && (
            <Link
              to="/categories"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {activeLabels.length === 1 ? activeLabels[0] : `${activeLabels.length} categories`}
            </Link>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
          As an Amazon Associate we earn from qualifying purchases.{" "}
          <Link to="/about" className="underline">
            Learn more
          </Link>
        </p>
      </header>

      <main className="relative flex-1 px-5 pb-28">
        <div className="relative mx-auto aspect-[3/4.6] h-full max-h-[640px] w-full max-w-md">
          {filtered.length > 0 ? (
            <SwipeDeck products={filtered} onAction={handleAction} />
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
          <SwipeHints swipeCount={swipeCount} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

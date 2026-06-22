import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      { title: "Swipe — Discover products you'll love" },
      {
        name: "description",
        content:
          "Swipe through hand-picked products. Right to like, left to pass, up to save for later.",
      },
      { property: "og:title", content: "Swipe — Discover products you'll love" },
      {
        property: "og:description",
        content: "A Tinder-style way to discover great products on your phone.",
      },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [products, setProducts] = useState<Product[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const { like, save, pass } = useProductLists();
  const { selected } = useCategories();

  const filtered = products.filter((p) => productMatchesCategories(p.category, selected));
  const activeLabels = selected
    .map((id) => CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean) as string[];

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const handleAction = (product: Product, action: "like" | "pass" | "save") => {
    if (action === "like") like(product.id);
    else if (action === "save") save(product.id);
    else pass(product.id);

    setSwipeCount((prev) => prev + 1);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-xl font-black tracking-tight">Swipe</h1>
        {activeLabels.length > 0 && (
          <Link
            to="/categories"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {activeLabels.length === 1 ? activeLabels[0] : `${activeLabels.length} categories`}
          </Link>
        )}
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

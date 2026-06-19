import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SwipeDeck } from "@/components/swipe-deck";
import { SwipeHints } from "@/components/swipe-hints";
import { BottomNav } from "@/components/bottom-nav";
import { getProducts, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";

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
  // Per-session counter so hints reappear on every fresh load until the user
  // has swiped a few times this session.
  const [swipeCount, setSwipeCount] = useState(0);
  const { like, save, pass } = useProductLists();

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const handleAction = (product: Product, action: "like" | "pass" | "save") => {
    if (action === "like") like(product.id);
    else if (action === "save") save(product.id);
    else pass(product.id);

    setSwipeCount((prev) => {
      const next = prev + 1;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SWIPE_COUNT_KEY, String(next));
      }
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-xl font-black tracking-tight">Swipe</h1>
        <span className="text-xs font-medium text-muted-foreground">Daily picks</span>
      </header>

      <main className="relative flex-1 px-5 pb-28">
        <div className="relative mx-auto aspect-[3/4.6] h-full max-h-[640px] w-full max-w-md">
          {products.length > 0 && (
            <SwipeDeck products={products} onAction={handleAction} />
          )}
          <SwipeHints swipeCount={swipeCount} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

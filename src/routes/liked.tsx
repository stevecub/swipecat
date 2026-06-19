import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { buildBuyUrl, getProducts, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";

export const Route = createFileRoute("/liked")({
  head: () => ({
    meta: [
      { title: "Liked — Swipe" },
      { name: "description", content: "Products you liked while swiping." },
      { property: "og:title", content: "Liked — Swipe" },
      { property: "og:description", content: "Your liked products in one place." },
    ],
  }),
  component: Liked,
});

function Liked() {
  const [products, setProducts] = useState<Product[]>([]);
  const { lists, remove } = useProductLists();

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const items = lists.liked
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-black tracking-tight">Liked</h1>
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No likes yet. Swipe right on products you love.
            </p>
            <Link
              to="/"
              className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Discover
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 pt-1">
            <AnimatePresence mode="popLayout">
              {items.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  exit={{ scale: 0, opacity: 0, borderRadius: "50%" }}
                  transition={{
                    layout: { duration: 0.55, ease: "easeInOut" },
                    exit: { duration: 0.45, ease: "easeInOut" },
                  }}
                  className="group relative overflow-hidden rounded-xl bg-card ring-1 ring-border"
                >
                  <a
                    href={buildBuyUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-active:scale-95"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="line-clamp-2 text-[11px] font-medium leading-tight">
                        {p.title}
                      </h3>
                      <p className="mt-1 text-xs font-bold">${p.price}</p>
                    </div>
                  </a>
                  <button
                    aria-label="Remove from liked"
                    onClick={() => remove(p.id)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-90 transition hover:bg-black/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

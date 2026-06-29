import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { buildBuyUrl, getProducts, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";

export const Route = createFileRoute("/passed")({
  head: () => ({
    meta: [
      { title: "Passed — SwipeCat" },
      { name: "description", content: "Products you passed on while swiping." },
      { property: "og:title", content: "Passed — SwipeCat" },
      { property: "og:description", content: "Your passed products in one place." },
    ],
  }),
  component: Passed,
});

function Passed() {
  const [products, setProducts] = useState<Product[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const { lists, remove, clearPassed } = useProductLists();

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const items = lists.passed
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const handleClearAll = () => {
    setConfirmClearOpen(false);
    clearPassed();
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-black tracking-tight">Passed</h1>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={() => setConfirmClearOpen(true)}
                className="text-xs font-semibold text-red-500 active:opacity-70"
              >
                Clear All
              </button>
            )}
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          As an Amazon Associate, we earn from qualifying purchases.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <X className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No passed items yet. Swipe left on products to pass.
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
                    duration: 0.45,
                    ease: "easeInOut",
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
                    aria-label="Remove from passed"
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

      {/* Clear All confirmation dialog */}
      <AnimatePresence>
        {confirmClearOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setConfirmClearOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[280px] rounded-2xl bg-white p-5 shadow-2xl text-center"
            >
              <h3 className="text-base font-bold text-gray-900 mb-1">
                Clear all passed items?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This can't be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 active:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white active:bg-red-600"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

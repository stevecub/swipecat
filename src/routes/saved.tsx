import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { getProducts, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved — Swipe" },
      { name: "description", content: "Products you liked or saved while swiping." },
      { property: "og:title", content: "Saved — Swipe" },
      { property: "og:description", content: "Your liked and saved products in one place." },
    ],
  }),
  component: Saved,
});

function Saved() {
  const [products, setProducts] = useState<Product[]>([]);
  const { lists, remove } = useProductLists();
  const [tab, setTab] = useState<"liked" | "saved">("liked");

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const ids = lists[tab];
  const items = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-black tracking-tight">Your picks</h1>
        <div className="mt-3 inline-flex rounded-full bg-muted p-1 text-sm font-medium">
          {(["liked", "saved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 capitalize transition ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t} ({lists[t].length})
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-28">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="text-4xl">🛍️</div>
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Start swiping to build your list.
            </p>
            <Link to="/" className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Discover
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 pt-2">
            {items.map((p) => (
              <li key={p.id} className="group relative overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                <Link to="/product/$id" params={{ id: p.id }} className="block">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <h3 className="truncate text-sm font-semibold">{p.title}</h3>
                    <p className="mt-0.5 text-sm font-bold">${p.price}</p>
                  </div>
                </Link>
                <button
                  aria-label="Remove"
                  onClick={() => remove(p.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100 active:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

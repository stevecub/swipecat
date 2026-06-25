import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, ExternalLink } from "lucide-react";
import { buildBuyUrl, getProduct, type Product } from "@/lib/products";
import { useProductLists } from "@/hooks/use-product-lists";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — Swipe" },
      { name: "description", content: "Product details." },
    ],
  }),
  component: ProductDetail,
  notFoundComponent: () => (
    <div className="flex h-[100dvh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Product not found</h1>
        <Link to="/" className="mt-3 inline-block text-sm underline">Back to discover</Link>
      </div>
    </div>
  ),
});

function ProductDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | undefined>();
  const { lists, like } = useProductLists();

  useEffect(() => {
    getProduct(id).then(setProduct);
  }, [id]);

  if (!product) {
    return <div className="flex h-[100dvh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  const isLiked = lists.liked.includes(product.id);
  const buyUrl = buildBuyUrl(product);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="relative">
        <img src={product.image} alt={product.title} className="h-[55vh] w-full object-cover" />
        <button
          onClick={() => router.history.back()}
          aria-label="Back"
          className="absolute left-4 top-4 rounded-full bg-white/90 p-2 text-foreground shadow backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 rounded-t-3xl -mt-6 bg-background px-5 pt-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {product.category}
        </span>
        <div className="mt-1 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-black leading-tight">{product.title}</h1>
          <div className="shrink-0 text-2xl font-black">{product.price != null ? `$${product.price}` : ""}</div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

        <div className="mt-6">
          <button
            onClick={() => like(product.id)}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold ring-1 transition ${
              isLiked
                ? "bg-[var(--color-like)] text-white ring-transparent"
                : "bg-card text-foreground ring-border"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-white" : ""}`} /> {isLiked ? "Liked" : "Like"}
          </button>
        </div>

        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          Buy on Amazon
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          As an Amazon Associate we earn from qualifying purchases.
        </p>
      </div>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  image: string;
  category: string;
  asin?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
};

type DbProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  currency: string;
  image: string;
  category: string;
  asin: string | null;
  rating: number | string | null;
  review_count: number | null;
};

function fromDb(r: DbProduct): Product {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    price: r.price == null ? null : Number(r.price),
    currency: r.currency,
    image: r.image,
    category: r.category,
    asin: r.asin,
    rating: r.rating == null ? null : Number(r.rating),
    reviewCount: r.review_count,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, description, price, currency, image, category, asin, rating, review_count")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("getProducts failed:", error.message);
    return [];
  }
  return (data as DbProduct[]).map(fromDb);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, description, price, currency, image, category, asin, rating, review_count")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return fromDb(data as DbProduct);
}

export const AFFILIATE_TAG: string | null = "swipecat-20";

export function buildBuyUrl(product: Product): string {
  const base = product.asin
    ? `https://www.amazon.com/dp/${product.asin}`
    : `https://www.amazon.com/s?k=${encodeURIComponent(product.title)}`;
  const sep = base.includes("?") ? "&" : "?";
  return AFFILIATE_TAG ? `${base}${sep}tag=${AFFILIATE_TAG}` : base;
}

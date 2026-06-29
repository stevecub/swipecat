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

/**
 * Requests the highest-resolution version of an Amazon product image.
 *
 * Amazon CDN URLs encode size constraints as underscore-wrapped tokens like
 * `_SL500_`, `_AC_UL320_`, `_SX679_`, `_UF894,894_`, etc. Removing all of
 * them causes Amazon's CDN to serve the original full-resolution master image.
 *
 * Examples of tokens stripped:
 *   _SL500_  _SL1500_  _SX679_  _SY300_  _UL320_  _UL1500_
 *   _AC_SX679_  _AC_UL320_  _AC_UY218_  _AC_UF894,894_
 *   _CR0,0,679,679_  _QL70_  _FMwebp_  _PIbundle-2,TopRight_  etc.
 */
function highResAmazonImage(url: string): string {
  if (!url.includes("media-amazon.com") && !url.includes("images-amazon.com")) {
    return url;
  }

  // Split on the last dot before the file extension to isolate the path segment
  // that contains all the size/quality tokens (the part between the ASIN and .jpg).
  // Amazon URLs look like:
  //   https://m.media-amazon.com/images/I/<ASIN-hash>._AC_SX679_.jpg
  //   https://m.media-amazon.com/images/I/<ASIN-hash>._SL1500_.jpg
  //   https://m.media-amazon.com/images/I/<ASIN-hash>.jpg  (already clean)
  //
  // Strategy: remove every `._<TOKEN>_` segment between the image ID and the
  // file extension. This leaves just the bare image ID + extension, which
  // Amazon's CDN serves at full resolution.
  return url
    // Remove all underscore-wrapped token groups (handles chained tokens too)
    .replace(/\._[^.]+_(?=\.[a-z]{2,4}(\?|$))/gi, "")
    // Remove any remaining lone size tokens like _SL500_ in the middle of the path
    .replace(/_[A-Z]{1,3}\d+_/g, "")
    // Clean up any double dots that might result
    .replace(/\.{2,}/g, ".");
}

function fromDb(r: DbProduct): Product {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    price: r.price == null ? null : Number(r.price),
    currency: r.currency,
    image: highResAmazonImage(r.image),
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

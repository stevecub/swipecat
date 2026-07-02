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


// Category values that map to each app category id.
// Must stay in sync with src/lib/categories.ts `matches` arrays.
const CATEGORY_VALUES: string[] = [
  "Women's Shoes",
  "Electronics",
  "Women's Fashion",
  "Men's Fashion",
  "Beauty & Skincare",
  "Home Decor",
  "Kitchen Gadgets",
  "Fitness & Activewear",
  "Jewelry & Accessories",
  "Pet Supplies",
];

/**
 * Fetches products balanced across all categories.
 *
 * The naive `ORDER BY created_at DESC LIMIT 500` caused a critical bug:
 * products inserted earlier in a bulk load (e.g. Home Decor) would fall
 * outside the 500-row window and never be returned, making that category
 * appear empty even though it had hundreds of products in the database.
 *
 * Fix: fetch up to 200 products per category (2000 total across 10 categories)
 * ordered randomly so users see different products each session.
 */
export async function getProducts(): Promise<Product[]> {
  const PER_CATEGORY = 200;

  const results = await Promise.all(
    CATEGORY_VALUES.map(async (cat) => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, price, currency, image, category, asin, rating, review_count")
        .eq("category", cat)
        .limit(PER_CATEGORY);
      if (error) {
        console.error(`getProducts [${cat}] failed:`, error.message);
        return [] as DbProduct[];
      }
      return (data ?? []) as DbProduct[];
    }),
  );

  // Flatten all category slices, convert, then shuffle so the deck isn't
  // grouped by category when no filter is applied.
  const all = results.flat().map(fromDb);

  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all;
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

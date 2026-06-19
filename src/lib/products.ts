export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  /** Future: Amazon ASIN — used to build affiliate links once PA-API is wired in */
  asin?: string;
};

// Placeholder product feed. Phase 2 will swap this for an Amazon PA-API
// (or third-party) adapter behind the same `getProducts()` interface.
const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: "Minimalist Leather Backpack",
    description: "Full-grain leather, 15\" laptop sleeve",
    price: 189,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80",
    category: "Bags",
  },
  {
    id: "p2",
    title: "Wireless Noise-Cancelling Headphones",
    description: "40hr battery, studio-grade drivers",
    price: 279,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80",
    category: "Audio",
  },
  {
    id: "p3",
    title: "Ceramic Pour-Over Set",
    description: "Hand-thrown dripper + carafe",
    price: 64,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80",
    category: "Home",
  },
  {
    id: "p4",
    title: "Linen Camp Shirt",
    description: "Breathable, relaxed fit",
    price: 78,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80",
    category: "Apparel",
  },
  {
    id: "p5",
    title: "Mechanical Keyboard — 65%",
    description: "Hot-swap, PBT keycaps, USB-C",
    price: 149,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=80",
    category: "Tech",
  },
  {
    id: "p6",
    title: "Stainless Travel Mug",
    description: "12hr hot, 24hr cold, leakproof",
    price: 32,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1572119865084-43c285814d63?w=900&q=80",
    category: "Home",
  },
  {
    id: "p7",
    title: "Vintage Film Camera",
    description: "35mm rangefinder, fully manual",
    price: 425,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=900&q=80",
    category: "Tech",
  },
  {
    id: "p8",
    title: "Wool Throw Blanket",
    description: "Merino blend, 50\" x 60\"",
    price: 119,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=900&q=80",
    category: "Home",
  },
  {
    id: "p9",
    title: "Running Shoes — Trail",
    description: "Grippy lugs, rock plate, breathable",
    price: 145,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80",
    category: "Apparel",
  },
  {
    id: "p10",
    title: "Smart Desk Lamp",
    description: "Tunable white, USB-C charging base",
    price: 89,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80",
    category: "Tech",
  },
  {
    id: "p11",
    title: "Cast Iron Skillet — 10\"",
    description: "Pre-seasoned, made in USA",
    price: 45,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=900&q=80",
    category: "Home",
  },
  {
    id: "p12",
    title: "Sunglasses — Acetate",
    description: "Polarized, hand-finished frames",
    price: 165,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900&q=80",
    category: "Apparel",
  },
];

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * Phase 2: when we wire in Amazon, set this from a user setting and append
 * `?tag=<AFFILIATE_TAG>` to every outbound Amazon URL.
 */
export const AFFILIATE_TAG: string | null = null;

export function buildBuyUrl(product: Product): string | null {
  if (!product.asin) return null;
  const base = `https://www.amazon.com/dp/${product.asin}`;
  return AFFILIATE_TAG ? `${base}?tag=${AFFILIATE_TAG}` : base;
}

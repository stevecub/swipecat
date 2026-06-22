// Curated category list for the swipe feed. Chosen for high engagement on
// visual/swipe-style shopping (fashion, beauty, lifestyle, tech-toys) — the
// segments that consistently drive the strongest browse → click-through on
// Amazon Associates traffic.
export type Category = {
  id: string;
  label: string;
  emoji: string;
  /** Exact Product.category values that belong to this group (case-insensitive). */
  matches: string[];
};

// `matches` entries must match Product.category EXACTLY (case-insensitive).
// Using "contains" caused bleed (e.g. "Women's Shoes" matched "Women's Fashion").
export const CATEGORIES: Category[] = [
  { id: "womens-shoes", label: "Women's Shoes", emoji: "👠", matches: ["Women's Shoes"] },
  { id: "electronics", label: "Electronics", emoji: "📱", matches: ["Electronics"] },
  { id: "womens-fashion", label: "Women's Fashion", emoji: "👗", matches: ["Women's Fashion"] },
  { id: "mens-fashion", label: "Men's Fashion", emoji: "👔", matches: ["Men's Fashion"] },
  { id: "beauty", label: "Beauty & Skincare", emoji: "💄", matches: ["Beauty & Skincare", "Beauty"] },
  { id: "home-decor", label: "Home Decor", emoji: "🛋️", matches: ["Home Decor"] },
  { id: "kitchen", label: "Kitchen Gadgets", emoji: "🍳", matches: ["Kitchen Gadgets", "Kitchen"] },
  { id: "fitness", label: "Fitness & Activewear", emoji: "🏋️", matches: ["Fitness & Activewear", "Fitness"] },
  { id: "jewelry", label: "Jewelry & Accessories", emoji: "💍", matches: ["Jewelry & Accessories", "Jewelry"] },
  { id: "pets", label: "Pet Supplies", emoji: "🐾", matches: ["Pet Supplies", "Pets"] },
];

const KEY = "swipeshop:categories:v1";

export function loadSelectedCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveSelectedCategories(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
}

/** Returns true if a product matches any of the selected category ids. */
export function productMatchesCategories(
  productCategory: string,
  selectedIds: string[],
): boolean {
  if (selectedIds.length === 0) return true;
  const pc = productCategory.trim().toLowerCase();
  return selectedIds.some((id) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    if (!cat) return false;
    return cat.matches.some((m) => m.trim().toLowerCase() === pc);
  });
}

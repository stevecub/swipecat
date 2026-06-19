// Curated category list for the swipe feed. Chosen for high engagement on
// visual/swipe-style shopping (fashion, beauty, lifestyle, tech-toys) — the
// segments that consistently drive the strongest browse → click-through on
// Amazon Associates traffic.
export type Category = {
  id: string;
  label: string;
  emoji: string;
  /** Tags that match against Product.category (case-insensitive contains). */
  matches: string[];
};

export const CATEGORIES: Category[] = [
  { id: "womens-shoes", label: "Women's Shoes", emoji: "👠", matches: ["women", "shoe", "heel", "sneaker"] },
  { id: "electronics", label: "Electronics", emoji: "📱", matches: ["electronics", "tech", "audio", "gadget"] },
  { id: "womens-fashion", label: "Women's Fashion", emoji: "👗", matches: ["women", "dress", "apparel"] },
  { id: "mens-fashion", label: "Men's Fashion", emoji: "👔", matches: ["men", "apparel", "shirt"] },
  { id: "beauty", label: "Beauty & Skincare", emoji: "💄", matches: ["beauty", "skincare", "makeup"] },
  { id: "home-decor", label: "Home Decor", emoji: "🛋️", matches: ["home", "decor"] },
  { id: "kitchen", label: "Kitchen Gadgets", emoji: "🍳", matches: ["kitchen", "home"] },
  { id: "fitness", label: "Fitness & Activewear", emoji: "🏋️", matches: ["fitness", "sport", "active", "apparel"] },
  { id: "jewelry", label: "Jewelry & Accessories", emoji: "💍", matches: ["jewelry", "accessor", "bag"] },
  { id: "pets", label: "Pet Supplies", emoji: "🐾", matches: ["pet"] },
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
  const pc = productCategory.toLowerCase();
  return selectedIds.some((id) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    if (!cat) return false;
    return cat.matches.some((m) => pc.includes(m.toLowerCase()));
  });
}

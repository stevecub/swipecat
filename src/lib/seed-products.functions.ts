import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIES } from "@/lib/categories";

type RainforestResult = {
  asin?: string;
  title?: string;
  image?: string;
  link?: string;
  rating?: number;
  ratings_total?: number;
  price?: { value?: number; currency?: string };
  prices?: Array<{ value?: number; currency?: string }>;
};

/**
 * Seeds the products table from Rainforest API.
 * Requires the caller to be an authenticated admin.
 * Uses the search endpoint: 1 request per category, ~16 products each.
 */
export const seedProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { categoryIds?: string[]; clear?: boolean }) => input ?? {},
  )
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr || !isAdmin) {
      throw new Error("Forbidden: admin role required");
    }

    const apiKey = process.env.RAINFOREST_API_KEY;
    if (!apiKey) throw new Error("RAINFOREST_API_KEY is not configured");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    if (data.clear) {
      await supabaseAdmin.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const targets = (data.categoryIds && data.categoryIds.length > 0)
      ? CATEGORIES.filter((c) => data.categoryIds!.includes(c.id))
      : CATEGORIES;

    const summary: Array<{ category: string; fetched: number; inserted: number; error?: string }> = [];

    for (const cat of targets) {
      try {
        const url = new URL("https://api.rainforestapi.com/request");
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("type", "search");
        url.searchParams.set("amazon_domain", "amazon.com");
        url.searchParams.set("search_term", cat.label);
        url.searchParams.set("sort_by", "featured");

        const res = await fetch(url.toString());
        if (!res.ok) {
          summary.push({ category: cat.label, fetched: 0, inserted: 0, error: `HTTP ${res.status}` });
          continue;
        }
        const json = (await res.json()) as { search_results?: RainforestResult[] };
        const results = json.search_results ?? [];

        const rows = results
          .filter((r) => r.asin && r.title && r.image)
          .map((r) => {
            const price = r.price?.value ?? r.prices?.[0]?.value ?? null;
            const currency = r.price?.currency ?? r.prices?.[0]?.currency ?? "USD";
            return {
              title: r.title!.slice(0, 300),
              description: "",
              price: price as number | null,
              currency,
              image: r.image!,
              category: cat.label,
              asin: r.asin!,
              rating: r.rating ?? null,
              review_count: r.ratings_total ?? null,
              source: "rainforest",
            };
          });

        if (rows.length === 0) {
          summary.push({ category: cat.label, fetched: results.length, inserted: 0 });
          continue;
        }

        // Upsert on asin so re-running doesn't duplicate
        const { error: upErr, count } = await supabaseAdmin
          .from("products")
          .upsert(rows, { onConflict: "asin", count: "exact", ignoreDuplicates: false });

        summary.push({
          category: cat.label,
          fetched: results.length,
          inserted: count ?? rows.length,
          error: upErr?.message,
        });
      } catch (e) {
        summary.push({
          category: cat.label,
          fetched: 0,
          inserted: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const { count: total } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true });

    return { summary, total: total ?? 0 };
  });

/**
 * Grants admin role to the calling user if there are no admins yet.
 * Self-service bootstrap so the very first user becomes admin.
 */
export const claimAdminIfFirst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      // Already an admin somewhere — check if it's the caller
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .eq("user_id", context.userId)
        .maybeSingle();
      return { granted: false, alreadyAdmin: !!data };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true, alreadyAdmin: true };
  });

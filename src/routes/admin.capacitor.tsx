/**
 * Capacitor-compatible admin panel.
 *
 * Unlike the SSR admin.tsx, this version calls Rainforest and Supabase
 * directly from the client — no server functions needed.
 *
 * Accessible at /#/admin inside the iOS app.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";

// ── Rainforest API key (baked in at build time) ───────────────────────────────
const RAINFOREST_KEY = import.meta.env.VITE_RAINFOREST_API_KEY as string;

export const Route = createFileRoute("/admin/capacitor")({
  component: AdminCapacitorPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type SeedRow = {
  category: string;
  fetched: number;
  inserted: number;
  error?: string;
};

// ── Image URL upgrader ────────────────────────────────────────────────────────
function upgradeImageUrl(url: string): string {
  if (!url) return url;
  return url
    .replace(/_SL\d+_/g, "_SL1500_")
    .replace(/_SX\d+_/g, "_SX1500_")
    .replace(/_AC_UL\d+_/g, "_AC_UL1500_")
    .replace(/_SS\d+_/g, "_SL1500_");
}

// ── Fetch one category from Rainforest ────────────────────────────────────────
const SEARCH_TERMS: Record<string, string> = {
  "womens-shoes":   "women's shoes bestsellers fashion",
  "electronics":    "electronics gadgets bestsellers",
  "womens-fashion": "women's fashion clothing bestsellers",
  "mens-fashion":   "men's fashion clothing bestsellers",
  "beauty":         "beauty skincare bestsellers makeup",
  "home-decor":     "home decor bestsellers interior",
  "kitchen":        "kitchen gadgets tools bestsellers",
  "fitness":        "fitness activewear workout gear bestsellers",
  "jewelry":        "jewelry accessories fashion bestsellers",
  "pets":           "pet supplies dog cat bestsellers",
};

async function fetchCategoryProducts(catId: string): Promise<{ asin: string; title: string; image: string; price: number | null; currency: string; description: string; rating: number | null; review_count: number | null }[]> {
  const searchTerm = SEARCH_TERMS[catId] ?? catId;
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", RAINFOREST_KEY);
  url.searchParams.set("type", "search");
  url.searchParams.set("amazon_domain", "amazon.com");
  url.searchParams.set("search_term", searchTerm);
  url.searchParams.set("sort_by", "featured");
  url.searchParams.set("fields", [
    "search_results.asin",
    "search_results.title",
    "search_results.image",
    "search_results.rating",
    "search_results.ratings_total",
    "search_results.price",
    "search_results.prices",
    "search_results.snippet",
  ].join(","));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const results: any[] = json.search_results ?? [];

  return results
    .filter((r: any) => r.asin && r.title && r.image)
    .map((r: any) => ({
      asin:         r.asin as string,
      title:        (r.title as string).slice(0, 300),
      image:        upgradeImageUrl(r.image as string),
      price:        r.price?.value ?? r.prices?.[0]?.value ?? null,
      currency:     r.price?.currency ?? r.prices?.[0]?.currency ?? "USD",
      description:  ((r.snippet ?? "") as string).slice(0, 1000),
      rating:       r.rating ?? null,
      review_count: r.ratings_total ?? null,
    }));
}

// ── Component ─────────────────────────────────────────────────────────────────
function AdminCapacitorPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [authMsg, setAuthMsg]   = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [rows, setRows]         = useState<SeedRow[]>([]);
  const [counts, setCounts]     = useState<Record<string, number>>({});
  const [total, setTotal]       = useState<number>(0);
  const [selected, setSelected] = useState<string[]>(CATEGORIES.map((c) => c.id));
  const [clearFirst, setClearFirst] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function refreshCounts() {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    setTotal(count ?? 0);

    const next: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      const { count: c } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("category", cat.label);
      next[cat.id] = c ?? 0;
    }
    setCounts(next);
  }

  useEffect(() => {
    if (signedIn) refreshCounts();
  }, [signedIn]);

  async function handleSignIn() {
    setAuthMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMsg(error.message);
  }

  async function handleSignUp() {
    setAuthMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthMsg(error.message);
    else setAuthMsg("Account created. Check your email to confirm.");
  }

  async function handleSeed() {
    if (!RAINFOREST_KEY) {
      setAuthMsg("VITE_RAINFOREST_API_KEY is not set in the build.");
      return;
    }
    setBusy(true);
    setRows([]);
    const summary: SeedRow[] = [];

    if (clearFirst) {
      setProgress("Clearing existing products…");
      const { error } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        setProgress(null);
        setAuthMsg("Clear failed: " + error.message);
        setBusy(false);
        return;
      }
    }

    for (const catId of selected) {
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (!cat) continue;
      setProgress(`Fetching ${cat.label}…`);
      try {
        const products = await fetchCategoryProducts(catId);
        const dbRows = products.map((p) => ({ ...p, category: cat.label, source: "rainforest" }));
        const { error, count } = await supabase
          .from("products")
          .upsert(dbRows, { onConflict: "asin", count: "exact", ignoreDuplicates: true });
        if (error) {
          summary.push({ category: cat.label, fetched: products.length, inserted: 0, error: error.message });
        } else {
          summary.push({ category: cat.label, fetched: products.length, inserted: count ?? dbRows.length });
        }
      } catch (e) {
        summary.push({ category: cat.label, fetched: 0, inserted: 0, error: e instanceof Error ? e.message : String(e) });
      }
      setRows([...summary]);
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 400));
    }

    setProgress(null);
    setBusy(false);
    await refreshCounts();
  }

  // ── Auth screen ──────────────────────────────────────────────────────────────
  if (signedIn === null) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-black tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage the product catalog.</p>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="flex gap-2">
            <button onClick={handleSignIn} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Sign in
            </button>
            <button onClick={handleSignUp} className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold">
              Sign up
            </button>
          </div>
          {authMsg && <p className="text-xs text-muted-foreground">{authMsg}</p>}
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:underline">← back to app</Link>
        </div>
      </div>
    );
  }

  // ── Main admin screen ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Admin · Catalog</h1>
        <Link to="/" className="text-xs text-muted-foreground hover:underline">← back to app</Link>
      </header>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <div>
          <h2 className="font-bold">Catalog</h2>
          <p className="text-xs text-muted-foreground">{total} products across {CATEGORIES.length} categories</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {CATEGORIES.map((c) => {
            const isOn = selected.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${isOn ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={(e) =>
                      setSelected((prev) => e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id))
                    }
                  />
                  <span>{c.emoji} {c.label}</span>
                </span>
                <span className="text-xs text-muted-foreground">{counts[c.id] ?? 0}</span>
              </label>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={clearFirst} onChange={(e) => setClearFirst(e.target.checked)} />
          Wipe existing products first
        </label>

        <button
          onClick={handleSeed}
          disabled={busy || selected.length === 0}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? (progress ?? "Working…") : `Seed ${selected.length} categor${selected.length === 1 ? "y" : "ies"}`}
        </button>

        <p className="text-[11px] text-muted-foreground">
          1 Rainforest request per category (~48 products each).
        </p>

        {authMsg && <p className="text-xs text-destructive">{authMsg}</p>}
      </section>

      {rows.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-border p-4">
          <h3 className="font-bold">Last run</h3>
          <div className="space-y-1 text-sm">
            {rows.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{s.category}</span>
                <span className={s.error ? "text-destructive" : "text-muted-foreground"}>
                  {s.error ? `❌ ${s.error}` : `+${s.inserted} / ${s.fetched}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        onClick={() => supabase.auth.signOut()}
        className="text-xs text-muted-foreground hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}

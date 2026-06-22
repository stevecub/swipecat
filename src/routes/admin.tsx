import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { seedProducts, claimAdminIfFirst } from "@/lib/seed-products.functions";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Swipecat" }] }),
  component: AdminPage,
});

type SeedResult = {
  summary: Array<{ category: string; fetched: number; inserted: number; error?: string }>;
  total: number;
};

function AdminPage() {
  const seed = useServerFn(seedProducts);
  const claim = useServerFn(claimAdminIfFirst);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number>(0);
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

  async function handleSignUp() {
    setAuthMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    if (error) setAuthMsg(error.message);
    else setAuthMsg("Account created. If email confirmation is on, check your inbox.");
  }

  async function handleSignIn() {
    setAuthMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMsg(error.message);
  }

  async function handleClaimAdmin() {
    setAuthMsg(null);
    try {
      const r = await claim();
      setAuthMsg(
        r.granted
          ? "✅ You are now the admin."
          : r.alreadyAdmin
            ? "You are already an admin."
            : "An admin already exists. Ask them to grant you the role.",
      );
    } catch (e) {
      setAuthMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSeed() {
    setBusy(true);
    setResult(null);
    try {
      const r = await seed({ data: { categoryIds: selected, clear: clearFirst } });
      setResult(r);
      await refreshCounts();
    } catch (e) {
      setResult({
        summary: [{ category: "error", fetched: 0, inserted: 0, error: e instanceof Error ? e.message : String(e) }],
        total: 0,
      });
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === null) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-black tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage the product catalog. The first account to claim admin becomes the owner.
        </p>
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
            <button
              onClick={handleSignIn}
              className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </button>
            <button
              onClick={handleSignUp}
              className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              Sign up
            </button>
          </div>
          {authMsg && <p className="text-xs text-muted-foreground">{authMsg}</p>}
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:underline">
            ← back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Admin · Catalog</h1>
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← back to app
        </Link>
      </header>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Catalog</h2>
            <p className="text-xs text-muted-foreground">
              {total} products across {CATEGORIES.length} categories
            </p>
          </div>
          <button
            onClick={handleClaimAdmin}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium"
          >
            Claim admin
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {CATEGORIES.map((c) => {
            const isOn = selected.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${
                  isOn ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                      )
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
          <input
            type="checkbox"
            checked={clearFirst}
            onChange={(e) => setClearFirst(e.target.checked)}
          />
          Wipe existing products first
        </label>

        <button
          onClick={handleSeed}
          disabled={busy || selected.length === 0}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Fetching from Rainforest…" : `Seed ${selected.length} categor${selected.length === 1 ? "y" : "ies"}`}
        </button>
        <p className="text-[11px] text-muted-foreground">
          1 Rainforest request per category (~16 products each). Trial = 100 requests total.
        </p>

        {authMsg && <p className="text-xs text-muted-foreground">{authMsg}</p>}
      </section>

      {result && (
        <section className="space-y-2 rounded-2xl border border-border p-4">
          <h3 className="font-bold">Last run</h3>
          <p className="text-xs text-muted-foreground">Catalog total: {result.total}</p>
          <div className="space-y-1 text-sm">
            {result.summary.map((s, i) => (
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
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/links")({
  head: () => ({ meta: [{ title: "Deferred Links — Admin — SwipeCat" }] }),
  component: AdminLinksPage,
});

type LinkStats = {
  shares_24h: number;
  shares_7d: number;
  shares_30d: number;
  claims_24h: number;
  claims_7d: number;
  claims_30d: number;
  total_shares: number;
  total_claims: number;
};

type RecentLink = {
  id: string;
  fingerprint: string;
  product_id: string;
  claimed: boolean;
  created_at: string;
};

function AdminLinksPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [recent, setRecent] = useState<RecentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (signedIn) fetchData();
  }, [signedIn]);

  async function fetchData() {
    setLoading(true);
    // Fetch stats from the view
    const { data: statsData } = await supabase
      .from("deferred_link_stats")
      .select("*")
      .single();
    if (statsData) setStats(statsData as unknown as LinkStats);

    // Fetch recent links
    const { data: recentData } = await supabase
      .from("deferred_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (recentData) setRecent(recentData as unknown as RecentLink[]);
    setLoading(false);
  }

  async function handleSignIn() {
    setAuthMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMsg(error.message);
  }

  async function handleCleanup() {
    await supabase.rpc("cleanup_expired_deferred_links");
    await fetchData();
  }

  if (signedIn === null) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-black tracking-tight">🔗 Deferred Links</h1>
        <p className="text-sm text-muted-foreground">Sign in to view link analytics.</p>
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
          <button
            onClick={handleSignIn}
            className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </button>
          {authMsg && <p className="text-xs text-destructive">{authMsg}</p>}
          <Link to="/admin" className="block text-center text-xs text-muted-foreground hover:underline">
            ← back to admin
          </Link>
        </div>
      </div>
    );
  }

  const conversionRate =
    stats && stats.total_shares > 0
      ? ((stats.total_claims / stats.total_shares) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">🔗 Deferred Links</h1>
        <div className="flex gap-3">
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">
            ← catalog
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:underline">
            ← app
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading stats…</div>
      ) : (
        <>
          {/* Summary Stats */}
          <section className="rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Overview</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {conversionRate}% conversion
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total Shares" value={stats?.total_shares ?? 0} />
              <StatCard label="Total Claims" value={stats?.total_claims ?? 0} />
              <StatCard label="Shares (24h)" value={stats?.shares_24h ?? 0} />
              <StatCard label="Claims (24h)" value={stats?.claims_24h ?? 0} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Shares (7d)" value={stats?.shares_7d ?? 0} />
              <StatCard label="Claims (7d)" value={stats?.claims_7d ?? 0} />
              <StatCard
                label="Conv. (7d)"
                value={
                  stats && stats.shares_7d > 0
                    ? `${((stats.claims_7d / stats.shares_7d) * 100).toFixed(1)}%`
                    : "—"
                }
              />
            </div>
          </section>

          {/* Actions */}
          <section className="flex gap-3">
            <button
              onClick={handleCleanup}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              🧹 Run Cleanup (expire &gt;2h)
            </button>
            <button
              onClick={fetchData}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              🔄 Refresh
            </button>
          </section>

          {/* Recent Links */}
          <section className="rounded-2xl border border-border p-4 space-y-3">
            <h2 className="font-bold">Recent Links</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet. Share a product to see data here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-3">Product</th>
                      <th className="pb-2 pr-3">Fingerprint</th>
                      <th className="pb-2 pr-3">Claimed</th>
                      <th className="pb-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((link) => (
                      <tr key={link.id} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-mono">{link.product_id}</td>
                        <td className="py-2 pr-3 font-mono text-muted-foreground">
                          {link.fingerprint.slice(0, 12)}…
                        </td>
                        <td className="py-2 pr-3">
                          {link.claimed ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">✓</span>
                          ) : (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">pending</span>
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(link.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

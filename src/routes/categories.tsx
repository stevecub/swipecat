import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { DailyPicksToggle } from "@/components/daily-picks-toggle";
import { CATEGORIES } from "@/lib/categories";
import { useCategories } from "@/hooks/use-categories";
import { useNetwork } from "@/hooks/use-network";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Swipe" },
      { name: "description", content: "Pick the categories you want to swipe." },
      { property: "og:title", content: "Categories — Swipe" },
      { property: "og:description", content: "Filter your swipe feed by category." },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { selected, toggle, clear } = useCategories();
  const { isOnline } = useNetwork();
  const count = selected.length;

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <OfflineBanner visible={!isOnline} />
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Categories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {count === 0
                ? "Showing everything. Tap to narrow your feed."
                : `Swiping ${count} ${count === 1 ? "category" : "categories"}. Tap again to remove.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
            <Link
              to="/"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Get Swiping
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        <ul className="grid grid-cols-2 gap-3 pt-2">
          {CATEGORIES.map((c) => {
            const active = selected.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  onClick={() => toggle(c.id)}
                  aria-pressed={active}
                  className={`relative flex w-full flex-col items-start gap-2 rounded-2xl p-4 text-left transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card ring-1 ring-border"
                  }`}
                >
                  <span className="text-3xl">{c.emoji}</span>
                  <span className="text-sm font-semibold leading-tight">{c.label}</span>
                  {active && (
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Notifications toggle */}
        <div className="mt-6 pt-4 border-t border-border">
          <h2 className="mb-3 text-sm font-bold text-foreground">Notifications</h2>
          <DailyPicksToggle />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

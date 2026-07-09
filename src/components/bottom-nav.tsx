import { Link, useRouterState } from "@tanstack/react-router";
import { Flame, Heart, LayoutGrid } from "lucide-react";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: "Discover", icon: Flame, active: pathname === "/" },
    { to: "/liked", label: "Liked", icon: Heart, active: pathname.startsWith("/liked") },
    { to: "/categories", label: "Categories", icon: LayoutGrid, active: pathname.startsWith("/categories") },
  ] as const;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      className="border-t border-border bg-background"
    >
      {/* Solid opaque background layer — ensures no transparency regardless of theme */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "oklch(0.985 0.005 90)" }}
        aria-hidden
      />
      <ul className="relative mx-auto flex max-w-md items-center justify-around px-6 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-0 px-4 py-1 text-[10px] font-medium transition ${
                  item.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${item.active ? "fill-foreground/10" : ""}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

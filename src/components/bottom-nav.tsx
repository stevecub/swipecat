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
    <nav className="shrink-0 z-30 border-t border-border bg-background">
      <ul className="mx-auto flex max-w-md items-center justify-around px-6 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium transition ${
                  item.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${item.active ? "fill-foreground/10" : ""}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

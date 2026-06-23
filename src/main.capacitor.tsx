/**
 * Static SPA entry point for the Capacitor iOS build.
 *
 * This bypasses TanStack Start's SSR pipeline entirely and mounts
 * TanStack Router directly in the browser. The admin route (which
 * uses server functions) is excluded — seeding is done from the web app.
 *
 * All user-facing routes (/, /liked, /categories, /product/$id,
 * /about, /privacy) are included and work fully client-side via Supabase.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router";

import "./styles.css";

// Import the Capacitor-specific route tree (excludes /admin which uses server functions)
import { routeTree } from "./routeTree.capacitor";

// Use hash-based history so Capacitor's file:// protocol works correctly
// (browser history requires a server; hash history works offline/native)
const hashHistory = createHashHistory();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

const router = createRouter({
  routeTree,
  history: hashHistory,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);

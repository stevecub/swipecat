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
import { SplashScreen } from "@capacitor/splash-screen";

import "./styles.css";
import { initDailyNotifications } from "./lib/daily-notifications";

// Import the Capacitor-specific route tree (excludes /admin which uses server functions)
import { routeTree } from "./routeTree.capacitor";

// ─── React Error Boundary ─────────────────────────────────────────────────────
// Class component required for componentDidCatch / getDerivedStateFromError
interface EBState { hasError: boolean; error: Error | null }
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SwipeCat] Uncaught React error:', error, info);
    // If React errors, still hide the splash screen so user sees the error
    hideSplash();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#c0392b', color: 'white', minHeight: '100vh', fontFamily: 'system-ui', boxSizing: 'border-box' as const }}>
          <h2 style={{ margin: '0 0 16px' }}>SwipeCat Error</h2>
          <p style={{ fontSize: '14px', wordBreak: 'break-all' as const, margin: '0 0 8px' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '16px', padding: '8px 16px', background: 'white', color: '#c0392b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Splash screen helper ─────────────────────────────────────────────────────
// launchAutoHide is false in capacitor.config.ts, so we must call this
// manually after React has rendered. This ensures the splash never hides
// before the app is ready, preventing the blank white screen.
let splashHidden = false;
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {
    // SplashScreen.hide() throws if called when no splash is showing (e.g. in browser)
    // Silently ignore this error
  });
  // Also hide our diagnostic boot overlay if present
  const bootEl = document.getElementById('boot-status');
  if (bootEl) bootEl.classList.add('hidden');
}

// Safety net: if React never mounts for any reason, hide splash after 10s
// so the user doesn't see the splash screen forever
setTimeout(() => {
  hideSplash();
  const bootEl = document.getElementById('boot-status');
  const bootMsg = document.getElementById('boot-msg');
  if (bootEl && !bootEl.classList.contains('hidden')) {
    if (bootMsg) bootMsg.textContent = 'Timeout: App did not load after 10s';
  }
}, 10000);

// ─── Router setup ─────────────────────────────────────────────────────────────
// Use hash-based history so Capacitor's capacitor://localhost scheme works correctly
// (browser history requires a server; hash history works with any URL scheme)
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

// ─── Mount ────────────────────────────────────────────────────────────────────
const rootElement = document.getElementById("root");

if (!rootElement) {
  hideSplash();
  document.body.innerHTML = '<div style="padding:40px;color:white;font-family:system-ui;background:#c0392b;min-height:100vh">FATAL: #root element not found</div>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </AppErrorBoundary>
      </React.StrictMode>,
    );

    // Hide the splash screen after React has started rendering.
    // Using requestAnimationFrame ensures at least one frame has been painted.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideSplash();
        // Re-schedule daily notifications if user previously enabled them
        // (iOS clears scheduled notifications on app update)
        initDailyNotifications().catch(() => {});
      });
    });
  } catch (err: any) {
    hideSplash();
    const msg = err?.message || String(err);
    document.body.innerHTML = `<div style="padding:40px;background:#c0392b;color:white;font-family:system-ui;min-height:100vh;box-sizing:border-box">
      <h2 style="margin:0 0 16px">SwipeCat Boot Error</h2>
      <p style="font-size:14px;word-break:break-all;margin:0">${msg}</p>
    </div>`;
  }
}

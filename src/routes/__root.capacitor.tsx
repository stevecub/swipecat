/**
 * Capacitor-specific root route.
 *
 * Key differences from __root.tsx:
 * - NO shellComponent (prevents rendering <html><head><body> inside #root,
 *   which creates invalid nested HTML that WKWebView rejects)
 * - NO head() config (meta tags and CSS are already in index.capacitor.html;
 *   HeadContent in SPA mode would try to inject duplicate <link> tags that
 *   may fail on the capacitor:// protocol)
 * - ErrorComponent does NOT use useRouter() (which can throw if the router
 *   hasn't initialized, causing React to unmount everything → blank screen)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
} from "@tanstack/react-router";

function NotFoundComponent() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: 0 }}>404</h1>
        <h2 style={{ marginTop: '1rem' }}>Page not found</h2>
        <p style={{ color: '#666' }}>The page you're looking for doesn't exist.</p>
        <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.5rem 1rem', background: '#E5306B', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
          Go home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  // IMPORTANT: Do NOT use useRouter() here — if the router hasn't initialized
  // when this error fires, useRouter() throws, causing React to unmount
  // everything and show a blank screen.
  console.error("SwipeCat route error:", error);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui', background: '#fff' }}>
      <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
          This page didn't load
        </h1>
        <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Something went wrong. Try going back home.
        </p>
        <p style={{ color: '#e74c3c', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '0.5rem', wordBreak: 'break-all' }}>
          {error?.message}
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1rem', background: '#E5306B', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ padding: '0.5rem 1rem', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // No head() — meta tags and CSS are in index.capacitor.html already.
  // No shellComponent — prevents invalid nested <html> inside #root.
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

/**
 * Vite config for the Capacitor iOS static SPA build.
 *
 * This is a completely separate build from the TanStack Start SSR build.
 * It produces a plain static site in dist-capacitor/ that Capacitor
 * can bundle into the iOS app.
 *
 * Usage:
 *   npm run build:capacitor   (runs: vite build --config vite.capacitor.config.ts)
 */

import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { readFile, rename, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Post-build plugin: renames index.capacitor.html → index.html
 * so Capacitor can find it as the app entry point.
 */
function renameHtmlPlugin(): Plugin {
  return {
    name: "rename-capacitor-html",
    closeBundle: async () => {
      const outDir = join(process.cwd(), "dist-capacitor");
      try {
        await rename(
          join(outDir, "index.capacitor.html"),
          join(outDir, "index.html"),
        );
        console.log("✓ Renamed index.capacitor.html → index.html");
      } catch {
        // Already renamed or doesn't exist — ignore
      }
    },
  };
}

/**
 * Post-build plugin: strips `crossorigin` attributes from the output HTML.
 *
 * Vite automatically adds `crossorigin` to ES module script tags and their
 * associated CSS link tags. On the `capacitor://localhost` protocol (non-http),
 * the crossorigin attribute causes WKWebView to fail loading resources silently
 * because CORS doesn't apply to custom URL schemes.
 */
function stripCrossoriginPlugin(): Plugin {
  return {
    name: "strip-crossorigin",
    closeBundle: async () => {
      const outDir = join(process.cwd(), "dist-capacitor");
      const htmlPath = join(outDir, "index.html");
      try {
        let html = await readFile(htmlPath, "utf-8");
        const original = html;
        // Remove crossorigin attribute (with or without value)
        html = html.replace(/\s+crossorigin(?:="[^"]*")?/gi, "");
        if (html !== original) {
          await writeFile(htmlPath, html, "utf-8");
          console.log("✓ Stripped crossorigin attributes from index.html");
        }
      } catch (err) {
        console.warn("⚠ Could not strip crossorigin:", err);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env so VITE_* vars are available at build time
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      renameHtmlPlugin(),
      stripCrossoriginPlugin(),
    ],

    // Entry point is the Capacitor-specific HTML
    root: ".",
    build: {
      outDir: "dist-capacitor",
      emptyOutDir: true,
      rollupOptions: {
        input: "index.capacitor.html",
      },
    },

    // Inject VITE_* env vars into the build
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY),
    },

    resolve: {
      alias: {
        "@": "/src",
      },
    },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// ─── PORT ─────────────────────────────────────────────────────────────────────
const rawPort = process.env.PORT;
const isBuild = process.argv.includes("build");

if (!rawPort && !isBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = rawPort ? Number(rawPort) : 3000;

if (!isBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ─── BASE_PATH ────────────────────────────────────────────────────────────────
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),

    // ── PWA ────────────────────────────────────────────────────────────────────
    // Service worker is only registered in production builds.
    // In development the plugin is a no-op so it does not interfere with
    // the Vite dev server proxy or HMR.
    VitePWA({
      registerType: "autoUpdate",
      // Do not activate the SW in the dev server — avoids cache confusion
      // during development and proxy issues with /api forwarding.
      devOptions: { enabled: false },

      includeAssets: ["icons/icon.svg"],

      manifest: {
        name:             "PixelStudio",
        short_name:       "PixelStudio",
        description:      "Photography studio management system",
        theme_color:      "#7c3aed",
        background_color: "#ffffff",
        display:          "standalone",
        scope:            "/",
        start_url:        "/",
        icons: [
          {
            src:     "icons/icon.svg",
            sizes:   "any",
            type:    "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        // Cache all compiled assets (JS chunks, CSS, fonts, SVG)
        globPatterns: ["**/*.{js,css,html,svg,woff2,ico,png,webp}"],

        runtimeCaching: [
          // ── App shell (HTML routes) ────────────────────────────────────────
          // NetworkFirst: load from network when online; fall back to cache
          // so all app pages load when offline.
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler:    "NetworkFirst",
            options: {
              cacheName:             "pages-cache",
              networkTimeoutSeconds: 5,
              expiration:            { maxEntries: 20, maxAgeSeconds: 86400 },
              cacheableResponse:     { statuses: [0, 200] },
            },
          },

          // ── Read-only API GET responses ────────────────────────────────────
          // StaleWhileRevalidate: serve cached data instantly, then refresh
          // in background.  Auth-mutating endpoints (POST/PUT/DELETE) are NOT
          // matched here — they go straight to the network.
          {
            urlPattern: ({ url, request }) =>
              (url.pathname.startsWith("/api/clients") ||
               url.pathname.startsWith("/api/gallery") ||
               url.pathname.startsWith("/api/staff")  ||
               url.pathname.startsWith("/api/payments")) &&
              request.method === "GET",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName:         "api-read-cache",
              expiration:        { maxEntries: 100, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Uploaded photos ────────────────────────────────────────────────
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
            handler:    "CacheFirst",
            options: {
              cacheName:         "uploads-cache",
              expiration:        { maxEntries: 300, maxAgeSeconds: 7 * 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),

    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

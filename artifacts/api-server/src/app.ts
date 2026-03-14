/**
 * api-server/src/app.ts
 *
 * Two modes, selected by NODE_ENV at build time:
 *
 * DEVELOPMENT (tsx ./src/index.ts — ESM context):
 *   Proxies all requests to pixelstudio-api running on localhost:3000.
 *   eval("require") is not valid in ESM, so we use the proxy here.
 *
 * PRODUCTION (node dist/index.cjs — esbuild CJS output):
 *   esbuild sets process.env.NODE_ENV = "production" via define, so the
 *   development branch becomes unreachable dead code and is eliminated.
 *   The else branch loads pixelstudio-api's Express app directly — no
 *   separate process needed, no proxy, no ECONNREFUSED.
 *   eval("require") works fine in the compiled CJS bundle.
 */

import type { Express } from "express";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";

let app: Express;

if (process.env.NODE_ENV !== "production") {
  // ── Development ────────────────────────────────────────────────────────────
  // Forward every request to the pixelstudio-api dev server on port 3000.
  const devApp = express();
  devApp.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:3000",
      changeOrigin: true,
      on: {
        error: (err, _req, res) => {
          console.error("[proxy] Error forwarding request:", err.message);
          if (res && "status" in res) {
            (res as import("express").Response)
              .status(502)
              .json({ success: false, message: "Backend unavailable" });
          }
        },
      },
    }),
  );
  app = devApp;
} else {
  // ── Production ─────────────────────────────────────────────────────────────
  // Load the real Express app directly from pixelstudio-api.
  // process.cwd() is the workspace root; the path is computed at runtime so
  // esbuild does not try to statically bundle pixelstudio-api.
  const appPath = path.resolve(
    process.cwd(),
    "artifacts/pixelstudio-api/src/app",
  );
  // eslint-disable-next-line no-eval
  app = eval("require")(appPath);
}

export default app;

/**
 * api-server/src/app.ts
 *
 * This server acts as a transparent reverse proxy that forwards all
 * requests to the PixelStudio API backend running on port 3000.
 *
 * Replit's path-based routing sends /api/* requests to this service.
 * We proxy them directly to pixelstudio-api (localhost:3000) which
 * handles all business logic.
 */

import express, { type Express } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app: Express = express();

// Proxy every request to the PixelStudio API backend.
// The full path (including /api prefix) is preserved so the backend
// receives exactly the same URL the browser sent.
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    // Forward WebSocket upgrades for any future WS support
    ws: false,
    // Log proxy errors so they surface in the api-server console
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
  })
);

export default app;

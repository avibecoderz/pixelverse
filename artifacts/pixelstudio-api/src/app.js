/**
 * app.js — Express Application Setup
 *
 * Configures middleware, routes, and error handling for the PixelStudio API.
 *
 * Middleware order matters:
 *   1. CORS           — must be first so preflight OPTIONS requests get headers
 *   2. Body parsers   — parse JSON and URL-encoded bodies before routes read them
 *   3. Static files   — serve /uploads before any auth middleware touches requests
 *   4. Request logger — log every request in development for easy debugging
 *   5. Routes         — all /api/* handlers
 *   6. 404 handler    — catch unmatched routes
 *   7. Error handler  — catch errors thrown by route handlers (must be last)
 */

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const routes         = require("./routes");
const errorMiddleware = require("./middlewares/errorMiddleware");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow the frontend origin to call the API.
//
// In development:  FRONTEND_URL is usually not set, so we fall back to allowing
//                  any localhost port.  This is fine because there is no sensitive
//                  cross-origin data exposed without a valid JWT.
//
// In production:   Set FRONTEND_URL in your .env to restrict CORS to your real
//                  domain, e.g. FRONTEND_URL=https://pixelstudio.ng

const allowedOrigins = [
  process.env.FRONTEND_URL,          // production origin (may be undefined in dev)
  "http://localhost:5173",           // default Vite dev port
  "http://localhost:4173",           // Vite preview
  "http://localhost:3000",           // fallback
].filter(Boolean); // remove undefined/null entries

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow any localhost port in all environments (Vite dev, tests, curl)
      if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        return callback(null, true);
      }

      // Allow Replit dev and preview domains (*.replit.dev, *.replit.app)
      // These are used by the Replit workspace preview iframe and the api-server proxy.
      if (origin.endsWith(".replit.dev") || origin.endsWith(".replit.app")) {
        return callback(null, true);
      }

      // Allow any explicit origin in the allow-list (production FRONTEND_URL)
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true, // allow cookies and Authorization headers
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
// Parse incoming JSON bodies (e.g. { "email": "...", "password": "..." })
app.use(express.json());

// Parse URL-encoded form data (e.g. classic HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ─────────────────────────────────────────────────────────────
// Serve uploaded photos at GET /uploads/<filename>
// This must be mounted before any auth middleware so gallery views work publicly.
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Dev Request Logger ───────────────────────────────────────────────────────
// Logs every request in development so you can trace what the frontend is calling.
// Skipped in production to avoid noisy logs — use a proper logger (winston/pino) there.
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─── Health Check ─────────────────────────────────────────────────────────────
// Simple liveness probe — returns 200 so load balancers and CI checks know
// the server is up without needing to authenticate.
app.get("/health", (_req, res) => {
  res.json({
    status:    "ok",
    message:   "PixelStudio API is running",
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || "development",
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// All routes are prefixed with /api — e.g. POST /api/auth/login
app.use("/api", routes);

// ─── Frontend Static Files (Production) ───────────────────────────────────────
// In production, Express serves the pre-built React app so only one process
// needs to run. The Vite dev server handles this in development instead.
//
// The React app is built to artifacts/pixelstudio/dist/public/ by:
//   pnpm --filter @workspace/pixelstudio run build
//
// Any path that is not /api/* or /uploads/* falls through to the SPA index.html
// so that client-side React Router routes work on a hard refresh or direct link.
//
// Detection: serve the frontend if the built index.html exists on disk — this
// works regardless of whether NODE_ENV is set by the host environment.
const frontendDist = path.join(__dirname, "../../pixelstudio/dist/public");
const isProduction =
  process.env.NODE_ENV === "production" ||
  require("fs").existsSync(path.join(frontendDist, "index.html"));

if (isProduction) {
  // Serve static assets (JS, CSS, images, fonts, etc.)
  app.use(express.static(frontendDist));

  // SPA fallback — any non-API, non-asset request gets index.html so React
  // Router can handle the route on the client side.
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  // ─── 404 Handler (Development) ────────────────────────────────────────────
  // In development the Vite dev server handles the frontend — any unknown
  // path here is a genuine missing API endpoint.
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      hint:    "Check the API docs for the correct endpoint path.",
    });
  });
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered LAST and must have exactly 4 parameters so Express
// recognises it as an error-handling middleware.
app.use(errorMiddleware);

module.exports = app;

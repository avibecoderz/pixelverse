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
  process.env.FRONTEND_URL,                     // from Render env
  "https://pixelverse-ten.vercel.app",          // your Vercel frontend
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://localhost:3000",
].filter(Boolean);

const isPrivateDevOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      // allow Postman / server requests
      if (!origin) return callback(null, true);

      // allow listed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin); // debug log
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
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

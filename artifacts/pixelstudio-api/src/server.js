/**
 * server.js — Entry point
 *
 * This file starts the HTTP server.
 * All Express configuration is done in app.js.
 * We keep this file small and focused on one job: listen on a port.
 */

// Load environment variables FIRST, before anything else
require("dotenv").config();

const app = require("./app");

// Read port from .env — Replit Cloud Run expects 3000 in production
const PORT = process.env.PORT || 3000;

// Start listening on all network interfaces (0.0.0.0) so the deployment
// proxy can reach the server. Binding to 127.0.0.1 (the default) only
// accepts connections from the same machine/container, which causes health
// check failures in Replit's autoscale deployment environment.
app.listen(PORT, "0.0.0.0", () => {
  console.log("─────────────────────────────────────────────");
  console.log(`  PixelStudio API`);
  console.log(`  Server running on http://0.0.0.0:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("─────────────────────────────────────────────");
});

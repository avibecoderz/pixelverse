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

// Read port from .env (default to 5000 if not set)
const PORT = process.env.PORT || 5000;

// Start listening for incoming requests
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────────");
  console.log(`  PixelStudio API`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("─────────────────────────────────────────────");
});

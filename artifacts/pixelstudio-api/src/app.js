/**
 * app.js — Express Application Setup
 *
 * This file creates and configures the Express application.
 * - CORS: allows the frontend to talk to this backend
 * - express.json: parses incoming JSON request bodies
 * - Routes: all API routes are mounted here
 * - Error handler: catches any unhandled errors at the end
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

const routes = require("./routes");
const errorMiddleware = require("./middlewares/errorMiddleware");

// Create the Express app
const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow requests from the PixelStudio frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // allow cookies/auth headers
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
// Parse incoming JSON bodies (e.g. { "username": "admin01", "password": "..." })
app.use(express.json());

// Parse URL-encoded form data (e.g. HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ─────────────────────────────────────────────────────────────
// Serve uploaded photos publicly at /uploads/filename.jpg
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health Check ─────────────────────────────────────────────────────────────
// Simple endpoint to confirm the server is alive
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PixelStudio API is running",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// All routes are prefixed with /api
// e.g. POST /api/auth/login, GET /api/clients, etc.
app.use("/api", routes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
// If no route matched, return a friendly 404 response
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Catches any error thrown inside route handlers or middleware
app.use(errorMiddleware);

module.exports = app;

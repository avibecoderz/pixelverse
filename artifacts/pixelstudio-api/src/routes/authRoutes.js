/**
 * authRoutes.js — Authentication Routes
 *
 * Mounted at /api/auth in routes/index.js
 *
 * ┌─────────────────────────────────────────────────────┬──────────┐
 * │ Endpoint                        │ Auth Required?     │ Role     │
 * ├─────────────────────────────────┼────────────────────┼──────────┤
 * │ POST /api/auth/login            │ No (public)        │ Any      │
 * │ GET  /api/auth/me               │ Yes (Bearer token) │ Any      │
 * │ POST /api/auth/change-password  │ Yes (Bearer token) │ Any      │
 * └─────────────────────────────────┴────────────────────┴──────────┘
 *
 * There is no registration endpoint.
 * Users (admin and staff) are created by the admin only.
 */

const express        = require("express");
const router         = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// ─── Public routes (no token needed) ─────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Authenticate a user and receive a JWT token.
 *
 * Request body:
 *   {
 *     "email":    "ngozi@pixelstudio.ng",
 *     "password": "mypassword",
 *     "role":     "admin"         ← must be "admin" or "staff"
 *   }
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "message": "Login successful",
 *     "data": {
 *       "token": "eyJhbGci...",
 *       "user":  { id, name, email, phone, role, isActive }
 *     }
 *   }
 *
 * Error responses:
 *   400 — missing fields or invalid role
 *   401 — wrong email or password
 */
router.post("/login", authController.login);

// ─── Protected routes (Bearer token required) ─────────────────────────────────

/**
 * GET /api/auth/me
 *
 * Returns the currently logged-in user's profile.
 * Fetches fresh data from the database — not just the JWT payload.
 * Use this to populate the dashboard header or verify session on page load.
 *
 * Request headers:
 *   Authorization: Bearer eyJhbGci...
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "data": { id, name, email, phone, role, isActive }
 *   }
 *
 * Error responses:
 *   401 — no/invalid token, or account deleted after token was issued
 *   403 — account has been deactivated
 */
router.get("/me", authMiddleware, authController.getMe);

/**
 * POST /api/auth/change-password
 *
 * Lets the currently logged-in user change their own password.
 * Works for both admin and staff.
 *
 * Request headers:
 *   Authorization: Bearer eyJhbGci...
 *
 * Request body:
 *   {
 *     "currentPassword": "oldpassword",
 *     "newPassword":     "newpassword"
 *   }
 *
 * Success response (200):
 *   { "success": true, "message": "Password changed successfully" }
 *
 * Error responses:
 *   400 — missing fields, too short, or same as current
 *   401 — wrong current password
 */
router.post("/change-password", authMiddleware, authController.changePassword);

module.exports = router;

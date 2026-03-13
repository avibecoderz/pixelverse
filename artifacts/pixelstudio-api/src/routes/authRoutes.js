/**
 * authRoutes.js — Authentication Routes
 *
 * Public:    POST /api/auth/login
 * Protected: POST /api/auth/change-password  (requires a valid JWT token)
 */

const express        = require("express");
const router         = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/auth/login
// Body: { username, password, role }
// Returns: { token, user }
router.post("/login", authController.login);

// ─── Protected ────────────────────────────────────────────────────────────────
// FIX: authMiddleware is required here so req.user is populated.
// Without it, changePassword would crash trying to read req.user.id.

// POST /api/auth/change-password
// Header: Authorization: Bearer <token>
// Body: { currentPassword, newPassword }
router.post("/change-password", authMiddleware, authController.changePassword);

module.exports = router;

/**
 * authRoutes.js — Authentication Routes
 *
 * Handles login for both Admin and Staff.
 * No token required for these endpoints (they are public).
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// POST /api/auth/login
// Body: { username, password, role }
// Returns: { token, user }
router.post("/login", authController.login);

// POST /api/auth/change-password
// Requires valid JWT token
// Body: { currentPassword, newPassword }
router.post("/change-password", authController.changePassword);

module.exports = router;

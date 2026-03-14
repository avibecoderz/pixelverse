/**
 * dashboardRoutes.js — Dashboard Routes
 *
 * Mounted at /api/dashboard in routes/index.js
 *
 * Both routes require a valid JWT token (authMiddleware).
 * The admin route additionally requires the "admin" role (roleMiddleware).
 *
 * ┌─────────────────────────────────────────┬──────────────────────────────────────────┐
 * │ Endpoint                                │ Who can access                           │
 * ├─────────────────────────────────────────┼──────────────────────────────────────────┤
 * │ GET /api/dashboard/admin                │ Admin only                               │
 * │ GET /api/dashboard/staff                │ Any authenticated user (admin or staff)  │
 * └─────────────────────────────────────────┴──────────────────────────────────────────┘
 *
 * Note: Admin users can also call /api/dashboard/staff to see their own
 * scoped stats — the handler reads req.user.id from the JWT, so it works
 * regardless of role.
 */

const express              = require("express");
const router               = express.Router();
const dashboardController  = require("../controllers/dashboardController");
const authMiddleware        = require("../middlewares/authMiddleware");
const roleMiddleware        = require("../middlewares/roleMiddleware");

// All dashboard routes require a valid token
router.use(authMiddleware);

// GET /api/dashboard/admin — admin only
router.get("/admin", roleMiddleware("admin"), dashboardController.getAdminDashboard);

// GET /api/dashboard/staff — any authenticated user
router.get("/staff", dashboardController.getStaffDashboard);

module.exports = router;

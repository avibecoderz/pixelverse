/**
 * staffRoutes.js — Staff Management Routes
 *
 * Only the Admin can access these endpoints.
 * authMiddleware verifies the JWT token.
 * roleMiddleware("admin") ensures only admin can call these.
 */

const express = require("express");
const router = express.Router();
const staffController  = require("../controllers/staffController");
const authMiddleware   = require("../middlewares/authMiddleware");
const roleMiddleware   = require("../middlewares/roleMiddleware");

// All staff routes require: valid token + admin role
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// GET    /api/staff          → list all staff members
// POST   /api/staff          → add a new staff member
// GET    /api/staff/:id      → get one staff member
// PUT    /api/staff/:id      → edit staff details
// DELETE /api/staff/:id      → remove a staff member
// PATCH  /api/staff/:id/password → change staff password

router.get("/",                      staffController.getAllStaff);
router.post("/",                     staffController.createStaff);
router.get("/:id",                   staffController.getStaffById);
router.put("/:id",                   staffController.updateStaff);
router.delete("/:id",                staffController.deleteStaff);
router.patch("/:id/password",        staffController.changeStaffPassword);

module.exports = router;

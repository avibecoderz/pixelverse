/**
 * staffRoutes.js — Staff Management Routes
 *
 * Mounted at /api/staff in routes/index.js
 *
 * All routes here require:
 *   1. A valid JWT token     → enforced by authMiddleware
 *   2. The "admin" role      → enforced by roleMiddleware("admin")
 *
 * Staff members cannot access any endpoint in this file.
 *
 * ┌─────────────────────────────────────────┬────────────────────────────────────────┐
 * │ Endpoint                                │ What it does                           │
 * ├─────────────────────────────────────────┼────────────────────────────────────────┤
 * │ GET    /api/staff                       │ List all staff (filter by ?active=)    │
 * │ POST   /api/staff                       │ Create a new staff account             │
 * │ GET    /api/staff/:id                   │ Get one staff member's details         │
 * │ PUT    /api/staff/:id                   │ Update name, email, phone              │
 * │ PATCH  /api/staff/:id/status            │ Activate or deactivate the account     │
 * │ PATCH  /api/staff/:id/password          │ Admin resets a staff password          │
 * │ DELETE /api/staff/:id                   │ Permanently remove the account         │
 * └─────────────────────────────────────────┴────────────────────────────────────────┘
 *
 * Route ordering note:
 *   PATCH /:id/status and PATCH /:id/password must be declared BEFORE /:id
 *   so Express matches the full path first, not the wildcard.
 */

const express = require("express");
const router  = express.Router();

const staffController = require("../controllers/staffController");
const authMiddleware  = require("../middlewares/authMiddleware");
const roleMiddleware  = require("../middlewares/roleMiddleware");
const { createStaffRules, changeStaffPasswordRules } = require("../validators/staffValidator");

// Apply both guards to every route in this file.
// Any request without a valid admin JWT token is rejected before reaching the handlers.
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// ─── Collection routes ────────────────────────────────────────────────────────

// GET  /api/staff       → returns all staff (optional ?active=true/false filter)
// POST /api/staff       → creates a new staff member
router.get("/",  staffController.getAllStaff);
router.post("/", createStaffRules, staffController.createStaff);

// ─── Sub-resource routes (declare BEFORE /:id to avoid wildcard conflicts) ───

// PATCH /api/staff/:id/status   → activate or deactivate a staff account
// PATCH /api/staff/:id/password → admin resets a staff password (no old password needed)
router.patch("/:id/status",   staffController.updateStaffStatus);
router.patch("/:id/password", changeStaffPasswordRules, staffController.changeStaffPassword);

// ─── Member routes ────────────────────────────────────────────────────────────

// GET    /api/staff/:id → get one staff member
// PUT    /api/staff/:id → update name, email, phone
// DELETE /api/staff/:id → remove a staff account (blocked if they have clients)
router.get("/:id",    staffController.getStaffById);
router.put("/:id",    staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);

module.exports = router;

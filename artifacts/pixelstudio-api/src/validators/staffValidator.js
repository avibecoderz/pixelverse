/**
 * staffValidator.js — Validation Rules for Staff Endpoints
 *
 * Wired into staffRoutes.js before controller functions.
 *
 *   router.post("/",              createStaffRules,        staffController.createStaff);
 *   router.patch("/:id/password", changeStaffPasswordRules, staffController.changeStaffPassword);
 *
 * updateStaff (PUT /:id) and updateStaffStatus (PATCH /:id/status) do their
 * own partial-update validation inside the controller — they do not need a
 * separate validator here because all fields are optional (nothing is
 * unconditionally required at the request boundary).
 */

const { validate } = require("../middlewares/validateMiddleware");

// ─── POST /api/staff ──────────────────────────────────────────────────────────
// All four fields are required to create a staff account.
// email must be a properly-formed email address.
// password must be at least 6 characters.
// Uniqueness (duplicate email) is still checked in the controller because
// it requires a database round-trip — format alone cannot catch it.
const createStaffRules = validate([
  {
    field:    "name",
    required: true,
    message:  "name is required",
  },
  {
    field:    "email",
    required: true,
    type:     "email",
    message:  "A valid email address is required",
  },
  {
    field:    "phone",
    required: true,
    message:  "phone is required",
  },
  {
    field:     "password",
    required:  true,
    minLength: 6,
    message:   "password must be at least 6 characters",
  },
]);

// ─── PATCH /api/staff/:id/password ───────────────────────────────────────────
// Admin override — only newPassword is needed (no current password required).
const changeStaffPasswordRules = validate([
  {
    field:     "newPassword",
    required:  true,
    minLength: 6,
    message:   "newPassword must be at least 6 characters",
  },
]);

module.exports = { createStaffRules, changeStaffPasswordRules };

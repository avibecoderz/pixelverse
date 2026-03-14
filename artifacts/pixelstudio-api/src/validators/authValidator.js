/**
 * authValidator.js — Validation Rules for Auth Endpoints
 *
 * Wired into authRoutes.js before the controller functions.
 * Each export is Express middleware — drop it between the route method and
 * the controller function and it will run first.
 *
 *   router.post("/login",           loginRules, authController.login);
 *   router.post("/change-password", authMiddleware, changePasswordRules, authController.changePassword);
 */

const { validate } = require("../middlewares/validateMiddleware");

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// All three fields are required.
// email must be a properly-formed email address — not just any non-blank string.
// role must be exactly "admin" or "staff" — the controller converts to uppercase for Prisma.
const loginRules = validate([
  {
    field:    "email",
    required: true,
    type:     "email",
    message:  "A valid email address is required",
  },
  {
    field:    "password",
    required: true,
    message:  "password is required",
  },
  {
    field:    "role",
    required: true,
    enum:     ["admin", "staff"],
    message:  "role must be 'admin' or 'staff'",
  },
]);

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Both passwords are required.
// newPassword must be at least 6 characters (same policy as staff creation).
// The controller checks that new !== current — that is business logic, not format.
const changePasswordRules = validate([
  {
    field:    "currentPassword",
    required: true,
    message:  "currentPassword is required",
  },
  {
    field:     "newPassword",
    required:  true,
    minLength: 6,
    message:   "newPassword must be at least 6 characters",
  },
]);

module.exports = { loginRules, changePasswordRules };

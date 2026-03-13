/**
 * authController.js — Authentication Controller
 *
 * Handles all authentication logic for PixelStudio.
 * Both Admin and Staff are stored in the same `users` table.
 * The `role` field (ADMIN / STAFF) separates their permissions.
 *
 * Exported functions:
 *   login          — POST /api/auth/login          (public)
 *   getMe          — GET  /api/auth/me             (protected)
 *   changePassword — POST /api/auth/change-password (protected)
 *
 * JWT payload shape: { id: string, role: "admin" | "staff", iat, exp }
 * The role is stored lowercase in the token to match roleMiddleware checks.
 */

const bcrypt             = require("bcryptjs");
const prisma             = require("../utils/prismaClient");
const { signToken }      = require("../utils/jwtUtils");
const { success, error } = require("../utils/responseUtils");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a lowercase role string to the Prisma enum value.
 * "admin" → "ADMIN",  "staff" → "STAFF",  anything else → null
 */
const toDbRole = (role) => {
  if (role === "admin") return "ADMIN";
  if (role === "staff") return "STAFF";
  return null;
};

/**
 * Safe user shape to return in responses.
 * NEVER include the hashed password in any API response.
 */
const formatUser = (user, roleOverride) => ({
  id:       user.id,
  name:     user.name,
  email:    user.email,
  phone:    user.phone,
  role:     roleOverride || user.role.toLowerCase(), // always lowercase for the frontend
  isActive: user.isActive,
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Login for Admin or Staff.
 *
 * Request body: { email, password, role }
 *   email    — the user's email address
 *   password — plain-text password (compared against bcrypt hash)
 *   role     — "admin" or "staff"
 *
 * Response: { token, user }
 *   token — a signed JWT to be sent with every subsequent request
 *   user  — safe user object (no password)
 *
 * Rules:
 *   - Only users whose isActive = true can log in
 *   - We return the same generic error for wrong email AND wrong password
 *     so that attackers cannot tell which field is incorrect
 */
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // ── Validate input ────────────────────────────────────────────────────────
    if (!email || !password || !role) {
      return error(res, "email, password, and role are required", 400);
    }

    // Convert "admin"/"staff" → "ADMIN"/"STAFF" for Prisma enum
    const dbRole = toDbRole(role);
    if (!dbRole) {
      return error(res, "role must be 'admin' or 'staff'", 400);
    }

    // ── Look up the user ──────────────────────────────────────────────────────
    // We filter by both email AND role so that a staff email cannot log in as admin
    // and vice versa. isActive: false accounts are silently rejected.
    const user = await prisma.user.findFirst({
      where: {
        email:    email.toLowerCase().trim(), // normalise before comparing
        role:     dbRole,
        isActive: true,
      },
    });

    // Generic message — don't tell the caller whether it was email or password
    if (!user) {
      return error(res, "Invalid email or password", 401);
    }

    // ── Verify password ───────────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return error(res, "Invalid email or password", 401);
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    // Store the user's id and lowercase role in the token payload.
    // authMiddleware will decode this and attach it to req.user.
    const token = signToken({ id: user.id, role }); // role is already lowercase here

    return success(res, "Login successful", {
      token,
      user: formatUser(user, role),
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Returns the currently logged-in user's profile.
 *
 * We always fetch fresh data from the database rather than returning the
 * JWT payload directly. This ensures:
 *   - If the admin deactivates an account, the next /me call fails
 *   - Name/email changes are reflected immediately without re-login
 *
 * Requires: Authorization: Bearer <token>
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware — contains { id, role } from the JWT
    const { id, role } = req.user;

    // Fetch the live record from the database
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id:        true,
        name:      true,
        email:     true,
        phone:     true,
        role:      true,
        isActive:  true,
        createdAt: true,
        // password is intentionally excluded
      },
    });

    if (!user) {
      // The token was valid but the user was deleted after it was issued
      return error(res, "User account no longer exists. Please log in again.", 401);
    }

    if (!user.isActive) {
      // The account was deactivated after the token was issued
      return error(res, "Your account has been deactivated. Contact the admin.", 403);
    }

    return success(res, "User profile fetched", formatUser(user, role));
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/change-password ──────────────────────────────────────────
/**
 * Lets the logged-in user change their own password.
 * Works for both Admin and Staff — both live in the users table.
 *
 * Requires: Authorization: Bearer <token>
 * Request body: { currentPassword, newPassword }
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.user; // from authMiddleware

    // ── Validate input ────────────────────────────────────────────────────────
    if (!currentPassword || !newPassword) {
      return error(res, "currentPassword and newPassword are required", 400);
    }
    if (newPassword.length < 6) {
      return error(res, "New password must be at least 6 characters", 400);
    }
    if (currentPassword === newPassword) {
      return error(res, "New password must be different from the current password", 400);
    }

    // ── Fetch user ────────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return error(res, "User not found", 404);

    // ── Verify old password ───────────────────────────────────────────────────
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return error(res, "Current password is incorrect", 401);

    // ── Hash and save ─────────────────────────────────────────────────────────
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data:  { password: hashed },
    });

    return success(res, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, changePassword };

/**
 * authController.js — Authentication Logic
 *
 * Login works for both Admin and Staff from the same `users` table.
 * The `role` field in the request body ("admin" or "staff") is used to filter
 * the correct record. The JWT token stores { id, role } for use by middleware.
 */

const bcrypt            = require("bcryptjs");
const prisma            = require("../utils/prismaClient");
const { signToken }     = require("../utils/jwtUtils");
const { success, error } = require("../utils/responseUtils");

// Helper: convert lowercase role string → uppercase Prisma enum value
// "admin" → "ADMIN",  "staff" → "STAFF"
const toDbRole = (role) => {
  if (role === "admin") return "ADMIN";
  if (role === "staff") return "STAFF";
  return null;
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, password, role }
// Both Admin and Staff are stored in the same `users` table.
// An INACTIVE account cannot log in.
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return error(res, "email, password, and role are required", 400);
    }

    const dbRole = toDbRole(role);
    if (!dbRole) {
      return error(res, "Invalid role. Must be 'admin' or 'staff'", 400);
    }

    // Look up by email + role in the unified users table.
    // Only allow accounts that are active (isActive: true).
    const user = await prisma.user.findFirst({
      where: { email, role: dbRole, isActive: true },
    });

    // Use a generic error message — don't reveal which field was wrong
    if (!user) {
      return error(res, "Invalid email or password", 401);
    }

    // Compare the submitted password against the bcrypt hash in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return error(res, "Invalid email or password", 401);
    }

    // Create a JWT token. role stored as lowercase ("admin"/"staff") so it
    // matches the strings used in roleMiddleware and ownership checks.
    const token = signToken({ id: user.id, role });

    return success(res, "Login successful", {
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        phone:    user.phone,
        role,                // lowercase: "admin" or "staff"
        isActive: user.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Protected by authMiddleware (req.user is set).
// Works for both admin and staff — both live in the users table.
// Body: { currentPassword, newPassword }
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.user; // set by authMiddleware

    if (!currentPassword || !newPassword) {
      return error(res, "currentPassword and newPassword are required", 400);
    }
    if (newPassword.length < 6) {
      return error(res, "New password must be at least 6 characters", 400);
    }
    if (currentPassword === newPassword) {
      return error(res, "New password must be different from the current password", 400);
    }

    // Both admin and staff are in the same table — no branching needed
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return error(res, "User not found", 404);

    // Verify the old password is correct before allowing the change
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return error(res, "Current password is incorrect", 401);

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

module.exports = { login, changePassword };

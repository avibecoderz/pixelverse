/**
 * authController.js — Authentication Logic
 *
 * Handles login for Admin and Staff.
 * On success: returns a signed JWT token + user info.
 * On failure: returns a 401 Unauthorized error.
 */

const bcrypt  = require("bcryptjs");
const prisma  = require("../utils/prismaClient");
const { signToken } = require("../utils/jwtUtils");
const { success, error } = require("../utils/responseUtils");

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password, role }  →  role is "admin" or "staff"
const login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    // Basic validation — make sure all fields are provided
    if (!username || !password || !role) {
      return error(res, "username, password, and role are required", 400);
    }

    let user = null;

    if (role === "admin") {
      // Look up the admin by username in the Admin table
      user = await prisma.admin.findUnique({ where: { username } });
    } else if (role === "staff") {
      // Look up the staff by username, and only allow ACTIVE accounts
      user = await prisma.staff.findFirst({
        where: { username, status: "ACTIVE" },
      });
    } else {
      return error(res, "Invalid role. Must be 'admin' or 'staff'", 400);
    }

    // If no user found, return generic error (don't reveal which is wrong)
    if (!user) {
      return error(res, "Invalid username or password", 401);
    }

    // Compare the submitted password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return error(res, "Invalid username or password", 401);
    }

    // Generate a JWT token containing the user's id and role
    const token = signToken({ id: user.id, role });

    // Return the token and basic user info (never send the password)
    return success(res, "Login successful", {
      token,
      user: {
        id:       user.id,
        name:     user.name,
        username: user.username,
        email:    user.email,
        role,
      },
    });
  } catch (err) {
    // Pass any unexpected errors to the global error handler
    next(err);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Requires valid JWT (req.user is set by authMiddleware)
// Body: { currentPassword, newPassword }
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user; // set by authMiddleware

    if (!currentPassword || !newPassword) {
      return error(res, "currentPassword and newPassword are required", 400);
    }

    if (newPassword.length < 6) {
      return error(res, "New password must be at least 6 characters", 400);
    }

    // Get the current user record based on their role
    const model = role === "admin" ? prisma.admin : prisma.staff;
    const user  = await model.findUnique({ where: { id } });

    if (!user) return error(res, "User not found", 404);

    // Verify the current password is correct
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return error(res, "Current password is incorrect", 401);

    // Hash the new password before saving
    const hashed = await bcrypt.hash(newPassword, 10);
    await model.update({ where: { id }, data: { password: hashed } });

    return success(res, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { login, changePassword };

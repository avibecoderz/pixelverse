/**
 * staffController.js — Staff Management Logic
 *
 * Manages User records with role = "STAFF".
 * All operations use prisma.user (not prisma.staff — that model no longer exists).
 * Only the Admin can call these routes (enforced by roleMiddleware in staffRoutes.js).
 *
 * Key field changes from old schema:
 *   username → removed (users are identified by email)
 *   status   → isActive (Boolean: true = active, false = inactive)
 */

const bcrypt             = require("bcryptjs");
const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// Reusable safe select — never return the hashed password
const STAFF_SELECT = {
  id:        true,
  name:      true,
  email:     true,
  phone:     true,
  role:      true,
  isActive:  true,
  createdAt: true,
};

// ─── GET /api/staff ───────────────────────────────────────────────────────────
// Returns all users with role STAFF.
const getAllStaff = async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where:   { role: "STAFF" },
      select:  STAFF_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return success(res, "Staff list fetched", staff);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/staff/:id ───────────────────────────────────────────────────────
const getStaffById = async (req, res, next) => {
  try {
    const staff = await prisma.user.findFirst({
      where:  { id: req.params.id, role: "STAFF" },
      select: STAFF_SELECT,
    });
    if (!staff) return error(res, "Staff member not found", 404);
    return success(res, "Staff fetched", staff);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/staff ──────────────────────────────────────────────────────────
// Creates a new staff account. Email must be unique across ALL users.
const createStaff = async (req, res, next) => {
  try {
    const { name, email, phone, password, isActive } = req.body;

    if (!name || !email || !phone || !password) {
      return error(res, "name, email, phone, and password are required", 400);
    }
    if (password.length < 6) {
      return error(res, "Password must be at least 6 characters", 400);
    }

    // Email must be unique across all users (admin + staff)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error(res, "A user with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role:     "STAFF",
        // isActive defaults to true; only set false if explicitly passed as false
        isActive: isActive === false ? false : true,
      },
      select: STAFF_SELECT,
    });

    return success(res, "Staff member created", staff, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────
// Updates staff profile fields. Password is updated separately via PATCH /:id/password.
const updateStaff = async (req, res, next) => {
  try {
    const { name, email, phone, isActive } = req.body;
    const staffId = req.params.id;

    // Confirm the user exists and is a STAFF member (not an admin)
    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    // If email is changing, make sure the new one is not already taken
    if (email && email !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email } });
      if (conflict) return error(res, "This email is already in use by another user", 409);
    }

    // Build the update object with only the fields that were actually provided
    const updateData = {};
    if (name     !== undefined) updateData.name     = name;
    if (email    !== undefined) updateData.email    = email;
    if (phone    !== undefined) updateData.phone    = phone;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const staff = await prisma.user.update({
      where:  { id: staffId },
      data:   updateData,
      select: STAFF_SELECT,
    });

    return success(res, "Staff member updated", staff);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/staff/:id ────────────────────────────────────────────────────
// Removes a staff account. Blocked if the staff member still has client records.
// The admin must delete or reassign those clients first.
const deleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id;

    // Safety: never allow deleting an admin via this route
    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    // Count clients created by this staff member (FK: createdById, not staffId)
    const clientCount = await prisma.client.count({
      where: { createdById: staffId },
    });
    if (clientCount > 0) {
      return error(
        res,
        `Cannot delete: this staff member has ${clientCount} client record(s). Delete or reassign them first.`,
        409
      );
    }

    await prisma.user.delete({ where: { id: staffId } });
    return success(res, "Staff member removed");
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/staff/:id/password ───────────────────────────────────────────
// Admin resets a staff member's password without needing the current one.
const changeStaffPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const staffId = req.params.id;

    if (!newPassword || newPassword.length < 6) {
      return error(res, "newPassword must be at least 6 characters", 400);
    }

    const staff = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!staff) return error(res, "Staff member not found", 404);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: staffId },
      data:  { password: hashed },
    });

    return success(res, `Password updated for ${staff.name}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllStaff, getStaffById, createStaff,
  updateStaff, deleteStaff, changeStaffPassword,
};

/**
 * staffController.js — Staff Management Logic
 *
 * Only the Admin can call these (enforced by roleMiddleware in staffRoutes.js).
 * Handles: list, create, update, delete, and password-reset for staff members.
 */

const bcrypt = require("bcryptjs");
const prisma  = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/staff ───────────────────────────────────────────────────────────
// Returns all staff members. Password is never included in the response.
const getAllStaff = async (req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        id: true, name: true, email: true,
        phone: true, username: true, status: true, createdAt: true,
      },
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
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true,
        phone: true, username: true, status: true, createdAt: true,
      },
    });
    if (!staff) return error(res, "Staff member not found", 404);
    return success(res, "Staff fetched", staff);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/staff ──────────────────────────────────────────────────────────
// Creates a new staff account with a hashed password.
const createStaff = async (req, res, next) => {
  try {
    const { name, email, phone, username, password, status } = req.body;

    if (!name || !email || !phone || !username || !password) {
      return error(res, "name, email, phone, username, and password are all required", 400);
    }
    if (password.length < 6) {
      return error(res, "Password must be at least 6 characters", 400);
    }

    // Check uniqueness for username AND email before creating
    const existing = await prisma.staff.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return error(res, "Username or email is already in use", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await prisma.staff.create({
      data: {
        name,
        email,
        phone,
        username,
        password: hashedPassword,
        status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      },
      select: {
        id: true, name: true, email: true,
        phone: true, username: true, status: true, createdAt: true,
      },
    });

    return success(res, "Staff member created", staff, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────
// Updates staff details. Password is NOT updated here (use PATCH /:id/password).
const updateStaff = async (req, res, next) => {
  try {
    const { name, email, phone, username, status } = req.body;
    const staffId = req.params.id;

    // Make sure the staff member actually exists before trying to update
    const existing = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!existing) return error(res, "Staff member not found", 404);

    // FIX: Build OR conditions dynamically to avoid passing empty {} to Prisma.
    // An empty {} in a Prisma OR clause matches EVERYTHING — it would always
    // find a "conflict" and block every update. We only check the fields that
    // are actually changing.
    const orConditions = [];
    if (username && username !== existing.username) orConditions.push({ username });
    if (email    && email    !== existing.email)    orConditions.push({ email });

    if (orConditions.length > 0) {
      const conflict = await prisma.staff.findFirst({
        where: {
          AND: [
            { id: { not: staffId } },    // exclude the current staff member
            { OR: orConditions },         // check if another record has this username/email
          ],
        },
      });
      if (conflict) return error(res, "Username or email is already in use by another staff member", 409);
    }

    // Build the update data object, only including fields that were provided
    const updateData = {};
    if (name     !== undefined) updateData.name     = name;
    if (email    !== undefined) updateData.email    = email;
    if (phone    !== undefined) updateData.phone    = phone;
    if (username !== undefined) updateData.username = username;
    if (status   !== undefined) updateData.status   = status;

    const staff = await prisma.staff.update({
      where: { id: staffId },
      data:  updateData,
      select: {
        id: true, name: true, email: true,
        phone: true, username: true, status: true, createdAt: true,
      },
    });

    return success(res, "Staff member updated", staff);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/staff/:id ────────────────────────────────────────────────────
// Removes a staff member. Will fail if they still have clients (FK: Restrict).
// The admin should delete or reassign the staff's clients first.
const deleteStaff = async (req, res, next) => {
  try {
    // Check for existing clients linked to this staff member
    const clientCount = await prisma.client.count({
      where: { staffId: req.params.id },
    });

    if (clientCount > 0) {
      return error(
        res,
        `Cannot delete: this staff member has ${clientCount} client record(s). Delete or reassign them first.`,
        409
      );
    }

    await prisma.staff.delete({ where: { id: req.params.id } });
    return success(res, "Staff member removed");
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/staff/:id/password ───────────────────────────────────────────
// Admin resets a staff member's password. No need to know the old one.
const changeStaffPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return error(res, "newPassword must be at least 6 characters", 400);
    }

    // Confirm the staff member exists before updating
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!staff) return error(res, "Staff member not found", 404);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.staff.update({
      where: { id: req.params.id },
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

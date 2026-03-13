/**
 * staffController.js — Staff Management Logic
 *
 * Only the Admin can call these.
 * Handles: list, create, update, delete, change-password for staff.
 */

const bcrypt = require("bcryptjs");
const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// GET /api/staff — list all staff members
const getAllStaff = async (req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        id:        true,
        name:      true,
        email:     true,
        phone:     true,
        username:  true,
        status:    true,
        createdAt: true,
        // Never return the hashed password in API responses
      },
      orderBy: { createdAt: "desc" },
    });

    return success(res, "Staff list fetched", staff);
  } catch (err) {
    next(err);
  }
};

// GET /api/staff/:id — get one staff member
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

// POST /api/staff — create a new staff member
const createStaff = async (req, res, next) => {
  try {
    const { name, email, phone, username, password, status } = req.body;

    if (!name || !email || !phone || !username || !password) {
      return error(res, "All fields are required", 400);
    }

    // Check if username or email is already taken
    const existing = await prisma.staff.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return error(res, "Username or email is already in use", 409);
    }

    // Hash the password — never store plain text passwords
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await prisma.staff.create({
      data: {
        name, email, phone, username,
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

// PUT /api/staff/:id — update staff details (not password)
const updateStaff = async (req, res, next) => {
  try {
    const { name, email, phone, username, status } = req.body;

    // Check if new username/email is taken by someone else
    if (username || email) {
      const conflict = await prisma.staff.findFirst({
        where: {
          AND: [
            { id: { not: req.params.id } },
            { OR: [username ? { username } : {}, email ? { email } : {}] },
          ],
        },
      });
      if (conflict) return error(res, "Username or email already in use", 409);
    }

    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data:  { name, email, phone, username, status },
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

// DELETE /api/staff/:id — remove a staff member
const deleteStaff = async (req, res, next) => {
  try {
    await prisma.staff.delete({ where: { id: req.params.id } });
    return success(res, "Staff member removed");
  } catch (err) {
    next(err);
  }
};

// PATCH /api/staff/:id/password — admin resets a staff member's password
const changeStaffPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return error(res, "Password must be at least 6 characters", 400);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.staff.update({
      where: { id: req.params.id },
      data:  { password: hashed },
    });

    return success(res, "Staff password updated successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllStaff, getStaffById, createStaff,
  updateStaff, deleteStaff, changeStaffPassword,
};

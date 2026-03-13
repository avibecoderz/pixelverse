/**
 * staffController.js — Staff Management Logic
 *
 * All staff accounts are stored in the `users` table with role = "STAFF".
 * The `users` table also holds admin accounts (role = "ADMIN").
 * Every function here filters by role = "STAFF" so admin accounts are
 * never accidentally modified or returned through these routes.
 *
 * Only the Admin can call these endpoints (enforced by roleMiddleware in routes).
 *
 * Exported functions:
 *   getAllStaff        — GET    /api/staff
 *   getStaffById       — GET    /api/staff/:id
 *   createStaff        — POST   /api/staff
 *   updateStaff        — PUT    /api/staff/:id
 *   updateStaffStatus  — PATCH  /api/staff/:id/status
 *   deleteStaff        — DELETE /api/staff/:id
 *   changeStaffPassword— PATCH  /api/staff/:id/password
 */

const bcrypt             = require("bcryptjs");
const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fields returned in every staff response.
 * `password` is intentionally excluded — never sent to the client.
 */
const STAFF_SELECT = {
  id:        true,
  name:      true,
  email:     true,
  phone:     true,
  role:      true,
  isActive:  true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Parse `isActive` from a request body safely.
 * Handles boolean true/false, strings "true"/"false", and undefined.
 * Returns true if the value is truthy but not explicitly false.
 *
 * Examples:
 *   parseIsActive(true)    → true
 *   parseIsActive("false") → false   ← handles string from form submissions
 *   parseIsActive(false)   → false
 *   parseIsActive(undefined) → null  ← caller decides the default
 */
const parseIsActive = (value) => {
  if (value === undefined) return null;
  if (value === false || value === "false" || value === 0) return false;
  return true;
};

/**
 * Validate that a required string field is present and not blank.
 * Returns the trimmed string, or null if it's missing/blank.
 */
const requireString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

// ─── GET /api/staff ───────────────────────────────────────────────────────────
/**
 * Returns all staff members, newest first.
 * Admin can optionally filter by status:
 *   GET /api/staff?active=true   → only active staff
 *   GET /api/staff?active=false  → only inactive staff
 *   GET /api/staff               → all staff
 */
const getAllStaff = async (req, res, next) => {
  try {
    const where = { role: "STAFF" };

    // Optional filter by active status from query string
    if (req.query.active !== undefined) {
      where.isActive = req.query.active !== "false";
    }

    const staff = await prisma.user.findMany({
      where,
      select:  STAFF_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return success(res, `${staff.length} staff member(s) found`, staff);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/staff/:id ───────────────────────────────────────────────────────
/**
 * Returns a single staff member by ID.
 * Returns 404 if the ID belongs to an admin — this route is staff-only.
 */
const getStaffById = async (req, res, next) => {
  try {
    const staff = await prisma.user.findFirst({
      where:  { id: req.params.id, role: "STAFF" },
      select: STAFF_SELECT,
    });

    if (!staff) return error(res, "Staff member not found", 404);
    return success(res, "Staff member fetched", staff);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/staff ──────────────────────────────────────────────────────────
/**
 * Creates a new staff account.
 *
 * Request body: { name, email, phone, password, isActive? }
 *   name     — required, must not be blank
 *   email    — required, must be unique across ALL users (admin + staff)
 *   phone    — required
 *   password — required, at least 6 characters (after trimming whitespace)
 *   isActive — optional, defaults to true
 *
 * The password is hashed with bcrypt before storing.
 * The role is always forced to "STAFF" — admin cannot set a different role here.
 */
const createStaff = async (req, res, next) => {
  try {
    const { password, isActive } = req.body;

    // ── Validate required string fields ───────────────────────────────────────
    const name  = requireString(req.body.name);
    const email = requireString(req.body.email);
    const phone = requireString(req.body.phone);

    if (!name)  return error(res, "name is required and must not be blank",  400);
    if (!email) return error(res, "email is required and must not be blank", 400);
    if (!phone) return error(res, "phone is required and must not be blank", 400);

    // ── Validate password ─────────────────────────────────────────────────────
    // Trim whitespace before checking length — " abc  " is only 3 real chars
    if (!password || String(password).trim().length < 6) {
      return error(res, "password must be at least 6 characters", 400);
    }

    // ── Normalise email ───────────────────────────────────────────────────────
    // Lowercase and trim before storing so "Staff@Example.com" and
    // "staff@example.com" are treated as the same email everywhere.
    const normalisedEmail = email.toLowerCase();

    // ── Check for duplicate email ─────────────────────────────────────────────
    // email is @unique in the schema — must be unique across admin + staff
    const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (existing) {
      return error(res, "A user with this email already exists", 409);
    }

    // ── Hash the password ─────────────────────────────────────────────────────
    // bcrypt salt rounds = 10 (good balance of security vs speed)
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Create the record ─────────────────────────────────────────────────────
    const staff = await prisma.user.create({
      data: {
        name,
        email:    normalisedEmail,
        phone,
        password: hashedPassword,
        role:     "STAFF", // always STAFF — admin cannot set role via this route
        isActive: parseIsActive(isActive) ?? true, // default active
      },
      select: STAFF_SELECT,
    });

    return success(res, "Staff member created successfully", staff, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────
/**
 * Updates a staff member's profile details.
 * Only fields included in the request body are updated (partial update).
 * Password changes use the separate PATCH /:id/password endpoint.
 *
 * Request body (all optional): { name, email, phone }
 * Note: use PATCH /:id/status to change isActive.
 */
const updateStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id;

    // ── Confirm the target is a staff account ─────────────────────────────────
    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    // ── Build update object — only include provided, non-blank fields ─────────
    const updateData = {};

    const name  = requireString(req.body.name);
    const phone = requireString(req.body.phone);
    let   email = requireString(req.body.email);

    // Reject explicitly provided but blank values
    if (req.body.name  !== undefined && !name)  return error(res, "name must not be blank",  400);
    if (req.body.phone !== undefined && !phone) return error(res, "phone must not be blank", 400);
    if (req.body.email !== undefined && !email) return error(res, "email must not be blank", 400);

    if (name)  updateData.name  = name;
    if (phone) updateData.phone = phone;

    if (email) {
      email = email.toLowerCase(); // normalise email

      // If email is changing, make sure the new one isn't taken by another user
      if (email !== existing.email) {
        const conflict = await prisma.user.findUnique({ where: { email } });
        if (conflict) return error(res, "This email is already in use by another user", 409);
      }
      updateData.email = email;
    }

    // If nothing was provided, return early — no need to hit the database
    if (Object.keys(updateData).length === 0) {
      return error(res, "No valid fields were provided to update", 400);
    }

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

// ─── PATCH /api/staff/:id/status ─────────────────────────────────────────────
/**
 * Activates or deactivates a staff account.
 * Deactivated staff cannot log in (login checks isActive: true).
 *
 * Request body: { isActive: true | false }
 *
 * This is separate from PUT /:id so the admin can toggle status with a
 * single dedicated action rather than needing to send the full profile.
 */
const updateStaffStatus = async (req, res, next) => {
  try {
    const staffId = req.params.id;
    const parsed  = parseIsActive(req.body.isActive);

    // isActive must be explicitly provided — null means it was missing
    if (parsed === null) {
      return error(res, "isActive is required (true to activate, false to deactivate)", 400);
    }

    // Confirm the target is a staff account (not an admin)
    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    // Skip the DB write if the status is already what was requested
    if (existing.isActive === parsed) {
      const state = parsed ? "already active" : "already inactive";
      return error(res, `This staff member is ${state}`, 409);
    }

    const staff = await prisma.user.update({
      where:  { id: staffId },
      data:   { isActive: parsed },
      select: STAFF_SELECT,
    });

    const message = parsed
      ? `${staff.name} has been activated`
      : `${staff.name} has been deactivated`;

    return success(res, message, staff);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/staff/:id ────────────────────────────────────────────────────
/**
 * Permanently removes a staff account.
 * Blocked if the staff member has any client records — the schema enforces
 * this with onDelete: Restrict on the clients.createdById FK.
 * The admin must delete or reassign those clients before deleting the account.
 */
const deleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id;

    // Safety: only STAFF accounts can be deleted through this route
    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    // Count linked client records before attempting the delete.
    // Giving a clear count in the error is more helpful than letting Prisma
    // throw a foreign key constraint error.
    const clientCount = await prisma.client.count({
      where: { createdById: staffId },
    });
    if (clientCount > 0) {
      return error(
        res,
        `Cannot delete ${existing.name}: they have ${clientCount} client record(s). Delete or reassign those clients first.`,
        409
      );
    }

    await prisma.user.delete({ where: { id: staffId } });
    return success(res, `${existing.name}'s account has been removed`);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/staff/:id/password ───────────────────────────────────────────
/**
 * Admin resets a staff member's password.
 * Unlike the self-service change-password in authController, this does NOT
 * require the current password — it is an admin override action.
 *
 * Request body: { newPassword }
 */
const changeStaffPassword = async (req, res, next) => {
  try {
    const staffId    = req.params.id;
    const { newPassword } = req.body;

    // Trim whitespace before the length check — same as auth module
    if (!newPassword || String(newPassword).trim().length < 6) {
      return error(res, "newPassword must be at least 6 characters", 400);
    }

    const staff = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!staff) return error(res, "Staff member not found", 404);

    // Hash with bcrypt using the ORIGINAL value (not trimmed)
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
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
  changeStaffPassword,
};

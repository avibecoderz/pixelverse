/**
 * staffController.js - Staff Management Logic
 *
 * All staff accounts are stored in the `users` table with role = "STAFF".
 * The `users` table also holds admin accounts (role = "ADMIN").
 * Every function here filters by role = "STAFF" so admin accounts are
 * never accidentally modified or returned through these routes.
 *
 * Only the Admin can call these endpoints (enforced by roleMiddleware in routes).
 *
 * Exported functions:
 *   getAllStaff        - GET    /api/staff
 *   getStaffById       - GET    /api/staff/:id
 *   createStaff        - POST   /api/staff
 *   updateStaff        - PUT    /api/staff/:id
 *   updateStaffStatus  - PATCH  /api/staff/:id/status
 *   deleteStaff        - DELETE /api/staff/:id
 *   changeStaffPassword- PATCH  /api/staff/:id/password
 */

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const prisma = require("../utils/prismaClient");
const { UPLOAD_DIR } = require("../utils/uploadUtils");
const { success, error } = require("../utils/responseUtils");

// Helpers

/**
 * Fields returned in every staff response.
 * `password` is intentionally excluded - never sent to the client.
 */
const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Parse `isActive` from a request body safely.
 * Handles boolean true/false, strings "true"/"false", JSON null, and undefined.
 * Returns null when the value is absent so callers can distinguish
 * "not provided" from "explicitly set to false".
 */
const parseIsActive = (value) => {
  if (value === undefined || value === null) return null;
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

const cleanupFileNames = (fileNames = []) => {
  fileNames.forEach((fileName) => {
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { /* best-effort */ }
    }
  });
};

// GET /api/staff
/**
 * Returns all staff members, newest first.
 * Admin can optionally filter by status:
 *   GET /api/staff?active=true   -> only active staff
 *   GET /api/staff?active=false  -> only inactive staff
 *   GET /api/staff               -> all staff
 */
const getAllStaff = async (req, res, next) => {
  try {
    const where = { role: "STAFF" };

    if (req.query.active !== undefined) {
      where.isActive = req.query.active !== "false";
    }

    const staff = await prisma.user.findMany({
      where,
      select: STAFF_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return success(res, `${staff.length} staff member(s) found`, staff);
  } catch (err) {
    next(err);
  }
};

// GET /api/staff/:id
/**
 * Returns a single staff member by ID.
 * Returns 404 if the ID belongs to an admin - this route is staff-only.
 */
const getStaffById = async (req, res, next) => {
  try {
    const staff = await prisma.user.findFirst({
      where: { id: req.params.id, role: "STAFF" },
      select: STAFF_SELECT,
    });

    if (!staff) return error(res, "Staff member not found", 404);
    return success(res, "Staff member fetched", staff);
  } catch (err) {
    next(err);
  }
};

// POST /api/staff
/**
 * Creates a new staff account.
 *
 * Request body: { name, email, phone, password, isActive? }
 * The password is hashed with bcrypt before storing.
 * The role is always forced to "STAFF".
 */
const createStaff = async (req, res, next) => {
  try {
    const { password, isActive } = req.body;

    const name = requireString(req.body.name);
    const email = requireString(req.body.email);
    const phone = requireString(req.body.phone);

    if (!name) return error(res, "name is required and must not be blank", 400);
    if (!email) return error(res, "email is required and must not be blank", 400);
    if (!phone) return error(res, "phone is required and must not be blank", 400);

    if (!password || String(password).trim().length < 6) {
      return error(res, "password must be at least 6 characters", 400);
    }

    const normalisedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (existing) {
      return error(res, "A user with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await prisma.user.create({
      data: {
        name,
        email: normalisedEmail,
        phone,
        password: hashedPassword,
        role: "STAFF",
        isActive: parseIsActive(isActive) ?? true,
      },
      select: STAFF_SELECT,
    });

    return success(res, "Staff member created successfully", staff, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/staff/:id
/**
 * Updates a staff member's profile details.
 * Only fields included in the request body are updated.
 */
const updateStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id;

    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    const updateData = {};

    const name = requireString(req.body.name);
    const phone = requireString(req.body.phone);
    let email = requireString(req.body.email);

    if (req.body.name !== undefined && !name) return error(res, "name must not be blank", 400);
    if (req.body.phone !== undefined && !phone) return error(res, "phone must not be blank", 400);
    if (req.body.email !== undefined && !email) return error(res, "email must not be blank", 400);

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    if (email) {
      email = email.toLowerCase();

      const conflict = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: staffId },
        },
      });
      if (conflict) return error(res, "This email is already in use by another user", 409);

      updateData.email = email;
    }

    if (Object.keys(updateData).length === 0) {
      return error(res, "No valid fields were provided to update", 400);
    }

    const staff = await prisma.user.update({
      where: { id: staffId },
      data: updateData,
      select: STAFF_SELECT,
    });

    return success(res, "Staff member updated", staff);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/staff/:id/status
/**
 * Activates or deactivates a staff account.
 * Deactivated staff cannot log in.
 *
 * Request body: { isActive: true | false }
 */
const updateStaffStatus = async (req, res, next) => {
  try {
    const staffId = req.params.id;
    const parsed = parseIsActive(req.body.isActive);

    if (parsed === null) {
      return error(res, "isActive is required (true to activate, false to deactivate)", 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    if (existing.isActive === parsed) {
      const state = parsed ? "already active" : "already inactive";
      return error(res, `This staff member is ${state}`, 409);
    }

    const staff = await prisma.user.update({
      where: { id: staffId },
      data: { isActive: parsed },
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

// DELETE /api/staff/:id
/**
 * Permanently removes a staff account.
 *
 * Deletion is destructive for records the staff member owns:
 *   - clients created by the staff member are deleted
 *   - uploaded photo files for those clients are removed from disk
 *
 * Shared operational records on other staff members' clients are preserved by
 * reassigning them to the admin performing the delete.
 */
const deleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id;

    const existing = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!existing) return error(res, "Staff member not found", 404);

    const clientsCreated = await prisma.client.findMany({
      where: { createdById: staffId },
      select: {
        id: true,
        photos: { select: { fileName: true } },
      },
    });

    const clientIds = clientsCreated.map((client) => client.id);
    const fileNamesToDelete = clientsCreated.flatMap((client) =>
      client.photos.map((photo) => photo.fileName)
    );

    const [galleryCount, invoiceCount, paymentCount] = await Promise.all([
      prisma.gallery.count({
        where: {
          uploadedById: staffId,
          client: {
            is: { createdById: { not: staffId } },
          },
        },
      }),
      prisma.invoice.count({
        where: {
          createdById: staffId,
          client: {
            is: { createdById: { not: staffId } },
          },
        },
      }),
      prisma.payment.count({
        where: {
          receivedById: staffId,
          client: {
            is: { createdById: { not: staffId } },
          },
        },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      if (clientIds.length > 0) {
        await tx.client.deleteMany({
          where: { id: { in: clientIds } },
        });
      }

      await tx.gallery.updateMany({
        where: {
          uploadedById: staffId,
          client: {
            is: { createdById: { not: staffId } },
          },
        },
        data: { uploadedById: req.user.id },
      });

      await tx.invoice.updateMany({
        where: {
          createdById: staffId,
          client: {
            is: { createdById: { not: staffId } },
          },
        },
        data: { createdById: req.user.id },
      });

      await tx.payment.updateMany({
        where: {
          receivedById: staffId,
          client: {
            is: { createdById: { not: staffId } },
          },
        },
        data: { receivedById: req.user.id },
      });

      await tx.user.delete({ where: { id: staffId } });
    });

    cleanupFileNames(fileNamesToDelete);

    const parts = [];
    if (clientIds.length > 0) parts.push(`${clientIds.length} client record(s) deleted`);
    if (fileNamesToDelete.length > 0) parts.push(`${fileNamesToDelete.length} uploaded photo file(s) removed`);
    if (galleryCount > 0) parts.push(`${galleryCount} gallery link(s) reassigned`);
    if (invoiceCount > 0) parts.push(`${invoiceCount} invoice(s) reassigned`);
    if (paymentCount > 0) parts.push(`${paymentCount} payment record(s) reassigned`);

    const summary = parts.length > 0 ? ` ${parts.join(", ")}.` : "";
    return success(res, `${existing.name}'s account has been removed.${summary}`);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/staff/:id/password
/**
 * Admin resets a staff member's password.
 * Unlike the self-service change-password in authController, this does NOT
 * require the current password.
 *
 * Request body: { newPassword }
 */
const changeStaffPassword = async (req, res, next) => {
  try {
    const staffId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).trim().length < 6) {
      return error(res, "newPassword must be at least 6 characters", 400);
    }

    const staff = await prisma.user.findFirst({
      where: { id: staffId, role: "STAFF" },
    });
    if (!staff) return error(res, "Staff member not found", 404);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: staffId },
      data: { password: hashed },
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

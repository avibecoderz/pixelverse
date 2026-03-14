/**
 * errorMiddleware.js — Global Error Handler
 *
 * This is the LAST middleware registered in app.js.
 * It catches any error passed via next(err) from route handlers or Multer.
 *
 * Error types handled:
 *   MulterError          — file upload violations (size, count, field name)
 *   Custom file filter   — wrong file type rejected by uploadUtils.fileFilter
 *   Prisma P2025         — record not found (e.g. delete non-existent ID)
 *   Prisma P2002         — unique constraint violation (e.g. duplicate email)
 *   Everything else      — generic 500 with stack trace in development only
 *
 * File cleanup:
 *   When a Multer or file-type error occurs mid-upload, Multer may have already
 *   written some accepted files to disk before the error was raised. Those files
 *   would become orphans since uploadPhotos never runs. This middleware deletes
 *   them from disk so the /uploads directory stays clean.
 */

const fs    = require("fs");
const path  = require("path");
const multer = require("multer");

// Import the upload directory path — same absolute path used by uploadUtils
// so cleanup here resolves to the exact same folder as the uploader.
const { UPLOAD_DIR } = require("../utils/uploadUtils");

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Delete any files Multer saved to disk before the error was raised.
 * Called only for Multer / file-type errors, where uploadPhotos never ran
 * and therefore its own cleanupFiles function was never called.
 */
const cleanupOrphanedFiles = (req) => {
  const files = req.files || [];
  files.forEach((file) => {
    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { /* best-effort */ }
    }
  });
};

// ─── Error middleware ─────────────────────────────────────────────────────────
// Express identifies a function with 4 arguments as an error-handling middleware.

const errorMiddleware = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log the full error server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // ── Multer: file too large ────────────────────────────────────────────────
  // Triggered when a single file exceeds the fileSize limit set in uploadUtils.
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    cleanupOrphanedFiles(req);
    const maxMb = Math.round(
      parseInt(process.env.MAX_FILE_SIZE || "20971520", 10) / 1024 / 1024
    );
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum allowed size is ${maxMb} MB per file.`,
    });
  }

  // ── Multer: too many files ────────────────────────────────────────────────
  // Triggered when the number of files exceeds the limit passed to upload.array().
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_COUNT") {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: "Too many files in a single request. Maximum is 50 photos per upload.",
    });
  }

  // ── Multer: unexpected field name ─────────────────────────────────────────
  // Triggered when the frontend uses a field name other than "photos".
  if (err instanceof multer.MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: `Unexpected upload field. Use 'photos' as the field name in your multipart/form-data request.`,
    });
  }

  // ── Any other MulterError ────────────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // ── Custom file-type rejection ────────────────────────────────────────────
  // Raised by the fileFilter in uploadUtils when a non-image file is submitted.
  // The error message starts with "Only image files" (set in uploadUtils.js).
  if (err.message && err.message.startsWith("Only image files")) {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // ── Prisma: record not found ──────────────────────────────────────────────
  // e.g. prisma.user.delete({ where: { id: "non-existent" } })
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found",
    });
  }

  // ── Prisma: unique constraint violation ───────────────────────────────────
  // e.g. duplicate email, duplicate invoice number
  if (err.code === "P2002") {
    const field = err.meta?.target || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // ── Prisma: foreign key constraint violation (Restrict) ───────────────────
  // Raised when a delete or update is blocked because another table still
  // holds a reference to the record being changed.
  // e.g. trying to delete a staff member who still has linked payments
  // that were not caught by the pre-check in staffController.
  //
  // Note: err.meta.field_name contains the raw MySQL constraint name such as
  // "payments_receivedById_fkey (index)" — not suitable for a user-facing
  // message, so we always return a fixed generic response here.
  if (err.code === "P2003") {
    return res.status(409).json({
      success: false,
      message: "Cannot complete this action because other records are still linked to this data. Remove or reassign them first.",
    });
  }

  // ── Prisma: null constraint violation ─────────────────────────────────────
  // Raised when a non-nullable column receives null — e.g. a required field
  // was omitted from a create/update call that bypassed the validate middleware.
  //
  // err.meta.constraint looks like "users.email" or "clients.clientName".
  // We strip the table-name prefix and show only the field name.
  if (err.code === "P2011") {
    const raw   = err.meta?.constraint || "";
    const field = raw.includes(".") ? raw.split(".").pop() : raw || "a required field";
    return res.status(400).json({
      success: false,
      message: `${field} is required and cannot be null`,
    });
  }

  // ── Fallback: generic server error ────────────────────────────────────────
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message    || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    // Stack trace is only visible in development — never leaked in production
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;

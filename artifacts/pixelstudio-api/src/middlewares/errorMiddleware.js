/**
 * errorMiddleware.js — Global Error Handler
 *
 * This is the LAST middleware registered in app.js.
 * It catches any error passed via next(err) from route handlers or Multer.
 *
 * Error types handled (in priority order):
 *   JsonWebTokenError    — malformed / tampered JWT               → 401
 *   TokenExpiredError    — valid JWT but past its expiry date     → 401
 *   MulterError (size)   — single file too large                  → 413
 *   MulterError (count)  — too many files                         → 400
 *   MulterError (field)  — wrong field name used in FormData      → 400
 *   MulterError (other)  — any other Multer upload error          → 400
 *   Custom file filter   — wrong MIME type rejected by uploadUtils → 400
 *   Prisma P2002         — unique constraint (e.g. duplicate email)→ 409
 *   Prisma P2003         — foreign key constraint (Restrict)      → 409
 *   Prisma P2011         — null constraint on a required column   → 400
 *   Prisma P2023         — invalid ID format (malformed cuid/uuid)→ 400
 *   Prisma P2025         — record-not-found on update/delete      → 404
 *   Everything else      — generic 500; stack trace in dev only
 *
 * File cleanup:
 *   Multer may have written files to disk before the error was raised.
 *   For Multer / file-type errors this middleware deletes those orphaned
 *   files so the /uploads directory stays clean.
 */

const fs     = require("fs");
const path   = require("path");
const multer = require("multer");

// Import the upload directory used by uploadUtils so cleanup resolves to
// the exact same folder.
const { UPLOAD_DIR } = require("../utils/uploadUtils");

// ─── Helper: remove any files Multer saved before the error ──────────────────

/**
 * Delete files that Multer wrote to disk before the error occurred.
 * Called only for upload-related errors — uploadPhotos was never reached
 * so its own cleanup never ran.
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
// Express identifies a 4-parameter function as an error handler.

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  // ── Server-side logging ───────────────────────────────────────────────────
  // Always log the full error server-side so developers can trace issues
  // without needing to reproduce them client-side.
  console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message || err}`);
  if (process.env.NODE_ENV === "development" && err.stack) {
    console.error(err.stack);
  }

  // ── JWT: malformed or tampered token ─────────────────────────────────────
  // Thrown by jsonwebtoken.verify() when the token cannot be decoded.
  // Common causes: the token was manually edited, or it came from a different
  // secret (e.g. a dev token used against production).
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please log in again.",
    });
  }

  // ── JWT: token has expired ────────────────────────────────────────────────
  // Thrown when the `exp` claim in the JWT payload is in the past.
  // The client should redirect to the login page when this is received.
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again.",
    });
  }

  // ── Multer: single file exceeds size limit ────────────────────────────────
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
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_COUNT") {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: "Too many files in a single request. Maximum is 50 photos per upload.",
    });
  }

  // ── Multer: wrong field name ──────────────────────────────────────────────
  if (err instanceof multer.MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: "Unexpected upload field name. Use 'photos' as the field name in your multipart/form-data request.",
    });
  }

  // ── Multer: any other upload error ───────────────────────────────────────
  if (err instanceof multer.MulterError) {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // ── Custom file-type rejection ────────────────────────────────────────────
  // Raised by fileFilter in uploadUtils when a non-image file is submitted.
  if (err.message && err.message.startsWith("Only image files")) {
    cleanupOrphanedFiles(req);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // ── Prisma: unique constraint violation ───────────────────────────────────
  // e.g. duplicate email address, duplicate invoice number
  //
  // err.meta.target is a string in Prisma v4 and an array in Prisma v5+.
  // We normalise both formats to a human-readable field name.
  if (err.code === "P2002") {
    const raw   = err.meta?.target;
    const field = Array.isArray(raw) ? raw.join(", ") : (raw || "field");
    // Strip table prefix (e.g. "users_email_key" → "email")
    const clean = field.replace(/^\w+_(\w+)_\w+$/, "$1");
    return res.status(409).json({
      success: false,
      message: `A record with this ${clean} already exists.`,
    });
  }

  // ── Prisma: foreign key constraint (Restrict) ─────────────────────────────
  // Raised when a delete or update is blocked by a linked record in another table.
  if (err.code === "P2003") {
    return res.status(409).json({
      success: false,
      message: "Cannot complete this action because other records are still linked to this data. Remove or reassign them first.",
    });
  }

  // ── Prisma: null constraint violation ─────────────────────────────────────
  // Raised when a non-nullable column receives null.
  // err.meta.constraint looks like "users.email" — strip the table prefix.
  if (err.code === "P2011") {
    const raw   = err.meta?.constraint || "";
    const field = raw.includes(".") ? raw.split(".").pop() : raw || "a required field";
    return res.status(400).json({
      success: false,
      message: `${field} is required and cannot be empty.`,
    });
  }

  // ── Prisma: invalid record ID format ─────────────────────────────────────
  // Raised when the ID in the URL is not a valid cuid/uuid for the database.
  // e.g. GET /api/clients/not-a-real-id
  if (err.code === "P2023") {
    return res.status(400).json({
      success: false,
      message: "The ID provided is not in a valid format.",
    });
  }

  // ── Prisma: record not found (on update/delete operations) ───────────────
  // Raised when prisma.model.update/delete is called with an ID that does not exist.
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // ── Fallback: unhandled error ─────────────────────────────────────────────
  // Covers everything else: uncaught throws, coding bugs, third-party errors.
  // Stack trace is included in development to speed up debugging, but is
  // never sent to clients in production (it can reveal sensitive paths/code).
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message    || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;

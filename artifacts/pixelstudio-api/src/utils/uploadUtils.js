/**
 * uploadUtils.js — Multer File Upload Configuration
 *
 * Configures how multipart/form-data file uploads are handled:
 *   - Where files are saved  (local disk, /uploads folder)
 *   - How they are named     (timestamp + random suffix + extension only)
 *   - What types are allowed (explicit MIME type allow-list, not a regex)
 *   - Maximum file size      (from .env MAX_FILE_SIZE, default 20 MB)
 *
 * Cloudinary migration note:
 *   To switch from local disk to Cloudinary, replace `storage` with
 *   multer-storage-cloudinary and update the imageUrl / publicId fields
 *   in photoController.js. The middleware chain in the routes does not change.
 *
 * UPLOAD_DIR is exported so the photo controller can use the same path
 * when cleaning up orphaned files after a failed DB insert.
 */

const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// ─── Upload directory ─────────────────────────────────────────────────────────
// Absolute path so every module that imports UPLOAD_DIR resolves to
// the same folder regardless of where the importing file sits in the tree.
const UPLOAD_DIR = path.join(__dirname, "../../uploads");

// Create the folder on startup if it doesn't exist yet
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Allowed MIME types ───────────────────────────────────────────────────────
// Explicit allow-list instead of a regex so we never accidentally accept a
// non-image file whose MIME type happens to contain the word "jpeg" etc.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ─── Disk storage ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  /**
   * Generate a safe, unique filename.
   *
   * We deliberately discard the user's original filename and keep only the
   * file extension. This prevents path-traversal attacks ("../../etc/passwd.jpg"),
   * shell injection, and filename collisions.
   *
   * Result pattern: photo-<timestamp>-<6-char random>.jpg
   * Example:        photo-1712345678901-k3x9pq.jpg
   */
  filename: (_req, file, cb) => {
    // Extract and sanitise the extension — allow only [a-z0-9] chars
    const rawExt  = path.extname(file.originalname).toLowerCase();
    const safeExt = rawExt.replace(/[^.a-z0-9]/g, ""); // strip unexpected chars
    const random  = Math.random().toString(36).slice(2, 8); // e.g. "k3x9pq"
    cb(null, `photo-${Date.now()}-${random}${safeExt}`);
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true); // accept
  } else {
    // Passing an Error (not null) tells Multer to reject this file and forward
    // the error to Express's error-handling middleware
    cb(new Error("Only image files are accepted: jpg, png, webp, gif"), false);
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    // MAX_FILE_SIZE in bytes. Default: 20 MB (20 × 1024 × 1024)
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "20971520", 10),
  },
});

module.exports = { upload, UPLOAD_DIR };

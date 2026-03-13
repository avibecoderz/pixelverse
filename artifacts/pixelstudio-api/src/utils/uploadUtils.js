/**
 * uploadUtils.js — Multer File Upload Configuration
 *
 * Multer is the library that handles multipart/form-data (file uploads).
 * Here we configure:
 *   - Where to save files (disk storage in the /uploads folder)
 *   - What to name them (timestamp + original name to avoid conflicts)
 *   - What file types are allowed (images only)
 *   - Maximum file size (from .env, default 20MB)
 */

const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// Make sure the uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Disk Storage ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  // Where to save the file
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  // What to name the file (e.g. "photo-1712345678901-portrait.jpg")
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName  = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `photo-${timestamp}-${safeName}`);
  },
});

// ─── File Filter ──────────────────────────────────────────────────────────────
// Only allow image files (JPEG, PNG, WEBP, etc.)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const isValid      = allowedTypes.test(file.mimetype);

  if (isValid) {
    cb(null, true); // accept the file
  } else {
    cb(new Error("Only image files are allowed (jpg, png, webp, gif)"), false);
  }
};

// ─── Multer Instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "20971520"), // default 20MB
  },
});

module.exports = { upload };

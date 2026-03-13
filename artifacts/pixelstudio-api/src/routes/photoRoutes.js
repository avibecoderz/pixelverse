/**
 * photoRoutes.js — Photo Upload & Delete Routes
 *
 * FIX: verifyClientOwnership now runs BEFORE Multer saves any files.
 *      This prevents orphaned files when clientId is invalid.
 *
 * FIX: Delete route parameter renamed to /:id to match req.params.id
 *      used in photoController.deletePhoto.
 */

const express = require("express");
const router  = express.Router();

const { verifyClientOwnership, uploadPhotos, deletePhoto } = require("../controllers/photoController");
const authMiddleware = require("../middlewares/authMiddleware");
const { upload }     = require("../utils/uploadUtils");

// All photo routes require a valid JWT token
router.use(authMiddleware);

// POST /api/photos/upload/:clientId
// Middleware chain (in order):
//   1. verifyClientOwnership — check client exists and belongs to this staff member
//   2. upload.array("photos", 50) — Multer saves valid files to disk
//   3. uploadPhotos — writes DB records and updates order status
router.post(
  "/upload/:clientId",
  verifyClientOwnership,
  upload.array("photos", 50),
  uploadPhotos
);

// DELETE /api/photos/:id — remove a single photo (file + DB record)
router.delete("/:id", deletePhoto);

module.exports = router;

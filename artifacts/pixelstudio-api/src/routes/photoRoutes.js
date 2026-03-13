/**
 * photoRoutes.js — Photo Upload Routes
 *
 * Staff upload edited photos for a specific client.
 * Multer handles the multipart/form-data file upload.
 */

const express = require("express");
const router = express.Router();
const photoController = require("../controllers/photoController");
const authMiddleware  = require("../middlewares/authMiddleware");
const { upload }      = require("../utils/uploadUtils");

// All photo routes require a valid token
router.use(authMiddleware);

// POST /api/photos/upload/:clientId
// Body: multipart/form-data with field "photos" (multiple files allowed)
// → uploads files to disk and saves URLs to the database
router.post(
  "/upload/:clientId",
  upload.array("photos", 50), // accept up to 50 photos at once
  photoController.uploadPhotos
);

// DELETE /api/photos/:photoId
// → removes a photo from disk and the database
router.delete("/:photoId", photoController.deletePhoto);

module.exports = router;

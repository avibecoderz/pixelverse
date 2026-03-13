/**
 * photoRoutes.js — Photo Management Routes (Protected)
 *
 * Photo UPLOAD is handled in clientRoutes.js under:
 *   POST /api/clients/:clientId/photos
 *
 * This file only handles photo deletion:
 *   DELETE /api/photos/:id  — removes a single photo (file + DB record)
 *
 * Staff can only delete photos that belong to their own clients.
 * Admin can delete any photo.
 */

const express        = require("express");
const router         = express.Router();
const photoController  = require("../controllers/photoController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.delete("/:id", photoController.deletePhoto);

module.exports = router;

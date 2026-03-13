/**
 * galleryRoutes.js — Public Gallery Routes (No Auth Required)
 *
 * These routes are intentionally public — they are used by clients
 * to view and download their photos via a unique share link.
 *
 * The token in the URL was generated when the client record was created.
 * It is unguessable (32 random hex characters), so only the intended
 * recipient can access the gallery.
 *
 * Mounted at /api/gallery in routes/index.js
 */

const express          = require("express");
const router           = express.Router();
const clientController = require("../controllers/clientController");

// GET /api/gallery/:token
// → Returns the client's name, order status, and list of photo URLs
// → Returns 404 if the token is invalid
// → Returns 403 if photos are not yet ready
router.get("/:token", clientController.getGalleryByToken);

module.exports = router;

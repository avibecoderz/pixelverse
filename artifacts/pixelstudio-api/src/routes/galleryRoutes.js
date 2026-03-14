/**
 * galleryRoutes.js — Public Gallery Routes (No Authentication Required)
 *
 * This file is intentionally public — no authMiddleware is applied here.
 * The gallery token acts as the credential. It is a 32-character
 * cryptographically random hex string, making it unguessable.
 *
 * Mounted at /api/gallery in routes/index.js
 *
 * Endpoints:
 *   GET /api/gallery/:token
 *     → 400 if the token format is invalid
 *     → 404 if no gallery matches the token
 *     → 403 with client name + status if photos are not ready yet (PENDING/EDITING)
 *     → 200 with full photo list if the order is READY or DELIVERED
 */

const express           = require("express");
const router            = express.Router();
const galleryController = require("../controllers/galleryController");

router.get("/:token", galleryController.getGalleryByToken);

module.exports = router;

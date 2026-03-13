/**
 * clientRoutes.js — Client Record Routes (Protected)
 *
 * All routes here require a valid JWT.
 * The public gallery-by-token route lives in galleryRoutes.js (no auth needed).
 *
 * Access matrix:
 *   Route                         Admin   Staff (own clients only)
 *   ─────────────────────────────────────────────────────────────────
 *   GET    /api/clients             ✓       ✓
 *   POST   /api/clients             ✓       ✓
 *   GET    /api/clients/:id         ✓       ✓
 *   PUT    /api/clients/:id         ✓       ✓
 *   DELETE /api/clients/:id         ✓       ✓
 *   POST   /api/clients/:id/photos  ✓       ✓ (own clients only)
 *
 * Optional query filters on GET /api/clients:
 *   ?orderStatus=EDITING       → filter by workflow stage
 *   ?paymentStatus=PENDING     → filter by payment state
 *
 * Photo upload middleware chain (in strict order):
 *   1. verifyClientOwnership — validate client + ownership before bytes hit disk
 *   2. upload.array("photos", 50) — Multer writes accepted files to /uploads
 *   3. uploadPhotos — inserts DB records, returns rich response
 */

const express          = require("express");
const router           = express.Router();
const clientController = require("../controllers/clientController");
const photoController  = require("../controllers/photoController");
const authMiddleware   = require("../middlewares/authMiddleware");
const { upload }       = require("../utils/uploadUtils");

// Every route in this file requires a valid token
router.use(authMiddleware);

// ─── Client CRUD ──────────────────────────────────────────────────────────────
router.get("/",    clientController.getAllClients);   // list (admin: all, staff: own)
router.post("/",   clientController.createClient);    // create new client record

// Specific sub-resource routes must be declared BEFORE the /:id wildcard
// so Express does not treat "photos" as a client ID.
router.post(
  "/:clientId/photos",
  photoController.verifyClientOwnership,      // step 1: validate before any I/O
  upload.array("photos", 50),                 // step 2: save files (max 50 per request)
  photoController.uploadPhotos                // step 3: write DB records + respond
);

// Wildcard single-client routes
router.get("/:id",    clientController.getClientById); // full detail
router.put("/:id",    clientController.updateClient);  // update fields
router.delete("/:id", clientController.deleteClient);  // permanent delete

module.exports = router;

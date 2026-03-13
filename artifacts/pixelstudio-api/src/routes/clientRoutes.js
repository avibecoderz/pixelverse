/**
 * clientRoutes.js — Client Record Routes (Protected)
 *
 * All routes here require a valid JWT.
 * The public gallery-by-token route lives in galleryRoutes.js (no auth needed).
 *
 * Access matrix:
 *   Route                    Admin   Staff (own clients only)
 *   ─────────────────────────────────────────────────────────
 *   GET  /api/clients         ✓       ✓
 *   POST /api/clients         ✓       ✓
 *   GET  /api/clients/:id     ✓       ✓
 *   PUT  /api/clients/:id     ✓       ✓
 *   DELETE /api/clients/:id   ✓       ✓
 *
 * Optional query filters on GET /api/clients:
 *   ?orderStatus=EDITING       → filter by workflow stage
 *   ?paymentStatus=PENDING     → filter by payment state
 */

const express          = require("express");
const router           = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware   = require("../middlewares/authMiddleware");

// Every route in this file requires a valid token
router.use(authMiddleware);

router.get("/",       clientController.getAllClients);  // list (admin: all, staff: own)
router.post("/",      clientController.createClient);   // create new client
router.get("/:id",    clientController.getClientById);  // full detail
router.put("/:id",    clientController.updateClient);   // update fields
router.delete("/:id", clientController.deleteClient);   // permanent delete

module.exports = router;

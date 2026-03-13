/**
 * clientRoutes.js — Client Record Routes (Protected)
 *
 * All routes here require a valid JWT token.
 * The public gallery route lives in galleryRoutes.js (no auth needed).
 */

const express = require("express");
const router  = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware   = require("../middlewares/authMiddleware");

// Protect every route in this file
router.use(authMiddleware);

// GET    /api/clients        → admin sees all, staff sees their own
// POST   /api/clients        → create a new client record (staff only in practice)
// GET    /api/clients/:id    → get one client's full details
// PUT    /api/clients/:id    → update a client record (ownership enforced)
// DELETE /api/clients/:id    → delete a client record (ownership enforced)

router.get("/",       clientController.getAllClients);
router.post("/",      clientController.createClient);
router.get("/:id",    clientController.getClientById);
router.put("/:id",    clientController.updateClient);
router.delete("/:id", clientController.deleteClient);

module.exports = router;

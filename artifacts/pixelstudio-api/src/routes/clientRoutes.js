/**
 * clientRoutes.js — Client Record Routes
 *
 * Staff can create and manage their own clients.
 * Admin can view all clients.
 */

const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware   = require("../middlewares/authMiddleware");

// All client routes require a valid JWT token
router.use(authMiddleware);

// GET    /api/clients          → list clients (admin sees all, staff sees own)
// POST   /api/clients          → create a new client record
// GET    /api/clients/:id      → get one client's details
// PUT    /api/clients/:id      → update client record
// DELETE /api/clients/:id      → delete a client record

router.get("/",        clientController.getAllClients);
router.post("/",       clientController.createClient);
router.get("/:id",     clientController.getClientById);
router.put("/:id",     clientController.updateClient);
router.delete("/:id",  clientController.deleteClient);

// GET /api/clients/gallery/:token → Public gallery link (no auth needed)
// Note: This route is defined separately in app.js or here with no middleware

module.exports = router;

/**
 * routes/index.js — Route Aggregator
 *
 * Mounts all route groups under /api.
 * Final URL pattern: /api/<group>/<specific-path>
 *
 * Gallery routes are intentionally public (no authMiddleware).
 * All other route groups apply their own auth inside their own files.
 */

const express = require("express");
const router  = express.Router();

const authRoutes    = require("./authRoutes");
const staffRoutes   = require("./staffRoutes");
const clientRoutes  = require("./clientRoutes");
const photoRoutes   = require("./photoRoutes");
const invoiceRoutes = require("./invoiceRoutes");
const paymentRoutes = require("./paymentRoutes");
const galleryRoutes = require("./galleryRoutes");  // PUBLIC — no token needed

router.use("/auth",     authRoutes);    // POST  /api/auth/login
                                        // POST  /api/auth/change-password (protected)
router.use("/staff",    staffRoutes);   // CRUD  /api/staff (admin only)
router.use("/clients",  clientRoutes);  // CRUD  /api/clients
router.use("/photos",   photoRoutes);   // POST  /api/photos/upload/:clientId
                                        // DELETE /api/photos/:id
router.use("/invoices", invoiceRoutes); // GET/POST /api/invoices
router.use("/payments", paymentRoutes); // GET/PATCH /api/payments
router.use("/gallery",  galleryRoutes); // GET  /api/gallery/:token (PUBLIC)

module.exports = router;

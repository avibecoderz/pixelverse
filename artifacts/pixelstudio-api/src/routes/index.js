/**
 * routes/index.js — Route Aggregator
 *
 * This file brings together all route files and mounts them
 * under their own path prefix. Adding a new feature means:
 *   1. Create a new route file (e.g. galleryRoutes.js)
 *   2. Import it here and add router.use("/gallery", galleryRoutes)
 */

const express = require("express");
const router = express.Router();

const authRoutes    = require("./authRoutes");
const staffRoutes   = require("./staffRoutes");
const clientRoutes  = require("./clientRoutes");
const photoRoutes   = require("./photoRoutes");
const invoiceRoutes = require("./invoiceRoutes");
const paymentRoutes = require("./paymentRoutes");

// Mount each group of routes
// Final URL will be: /api/<prefix>/<route-defined-path>
router.use("/auth",     authRoutes);    // POST /api/auth/login, /api/auth/logout
router.use("/staff",    staffRoutes);   // GET/POST/PUT/DELETE /api/staff
router.use("/clients",  clientRoutes);  // GET/POST/PUT/DELETE /api/clients
router.use("/photos",   photoRoutes);   // POST /api/photos/upload/:clientId
router.use("/invoices", invoiceRoutes); // GET/POST /api/invoices
router.use("/payments", paymentRoutes); // GET/POST /api/payments

module.exports = router;

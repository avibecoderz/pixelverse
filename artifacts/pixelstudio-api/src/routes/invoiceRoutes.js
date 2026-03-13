/**
 * invoiceRoutes.js — Invoice Routes
 *
 * Staff can generate and view invoices for their clients.
 * Admin can see all invoices.
 */

const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");
const authMiddleware    = require("../middlewares/authMiddleware");

router.use(authMiddleware);

// GET  /api/invoices           → list all invoices
// POST /api/invoices/:clientId → generate invoice for a client
// GET  /api/invoices/:id       → get invoice details

router.get("/",              invoiceController.getAllInvoices);
router.post("/:clientId",    invoiceController.generateInvoice);
router.get("/:id",           invoiceController.getInvoiceById);

module.exports = router;

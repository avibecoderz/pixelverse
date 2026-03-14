/**
 * invoiceRoutes.js — Invoice Routes
 *
 * One client can have many invoices.
 * Staff generate and view invoices for their own clients.
 * Admin can view all invoices.
 */

const express           = require("express");
const router            = express.Router();
const invoiceController = require("../controllers/invoiceController");
const authMiddleware    = require("../middlewares/authMiddleware");
const { generateInvoiceRules } = require("../validators/invoiceValidator");

router.use(authMiddleware);

// GET   /api/invoices                → list invoices (admin all, staff own clients)
// POST  /api/invoices/:clientId      → generate a new invoice for a client
// GET   /api/invoices/:id            → get one invoice's full details
// PATCH /api/invoices/:id/mark-paid  → mark a specific invoice as PAID

router.get("/",                    invoiceController.getAllInvoices);
router.post("/:clientId",          generateInvoiceRules, invoiceController.generateInvoice);
router.get("/:id",                 invoiceController.getInvoiceById);
router.patch("/:id/mark-paid",     invoiceController.markInvoicePaid);

module.exports = router;

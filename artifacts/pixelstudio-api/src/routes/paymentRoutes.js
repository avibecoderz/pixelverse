/**
 * paymentRoutes.js — Payment Routes
 *
 * Uses the real payments table (prisma.payment).
 * Admin can see all payments. Staff records and views payments for their own clients.
 */

const express           = require("express");
const router            = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware    = require("../middlewares/authMiddleware");
const { recordPaymentRules } = require("../validators/paymentValidator");

router.use(authMiddleware);

// GET  /api/payments             → list all payment records (admin) or own (staff)
// GET  /api/payments/:id         → get one payment record
// POST /api/payments/:clientId   → record a new payment for a client

router.get("/",               paymentController.getAllPayments);
router.get("/:id",            paymentController.getPaymentById);
router.post("/:clientId",     recordPaymentRules, paymentController.recordPayment);

module.exports = router;

/**
 * paymentRoutes.js — Payment Routes
 *
 * Admin can see all payments.
 * Staff can record payments for their own clients.
 */

const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware    = require("../middlewares/authMiddleware");

router.use(authMiddleware);

// GET   /api/payments           → list all payments (admin) or own (staff)
// PATCH /api/payments/:clientId → mark a client's payment as Paid

router.get("/",                paymentController.getAllPayments);
router.patch("/:clientId",     paymentController.markAsPaid);

module.exports = router;

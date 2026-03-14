/**
 * paymentValidator.js — Validation Rules for Payment Endpoints
 *
 * Wired into paymentRoutes.js before controller functions.
 *
 *   router.post("/:clientId", recordPaymentRules, paymentController.recordPayment);
 */

const { validate } = require("../middlewares/validateMiddleware");

// ─── POST /api/payments/:clientId ─────────────────────────────────────────────
// amount is required — every payment record must have a confirmed amount.
// It must be a positive number (min: 0 means value must be > 0).
const recordPaymentRules = validate([
  {
    field:    "amount",
    required: true,
    type:     "number",
    min:      0,       // exclusive: value must be strictly greater than 0
    message:  "amount must be a positive number greater than zero",
  },
]);

module.exports = { recordPaymentRules };

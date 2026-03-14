/**
 * invoiceValidator.js — Validation Rules for Invoice Endpoints
 *
 * Wired into invoiceRoutes.js before controller functions.
 *
 *   router.post("/:clientId", generateInvoiceRules, invoiceController.generateInvoice);
 *
 * amount is OPTIONAL on invoice generation — if not supplied the controller
 * defaults to the client's session price.  But if it IS supplied, it must
 * be a positive number so we catch bad values before the DB is touched.
 */

const { validate } = require("../middlewares/validateMiddleware");

// ─── POST /api/invoices/:clientId ─────────────────────────────────────────────
// amount is optional — validate format only when it is actually provided.
// (The validate middleware skips type/min checks when the field is absent.)
const generateInvoiceRules = validate([
  {
    field:    "amount",
    required: false,   // optional — controller falls back to client.price
    type:     "number",
    min:      0,       // exclusive: value must be strictly greater than 0
    message:  "amount must be a positive number greater than zero",
  },
]);

module.exports = { generateInvoiceRules };

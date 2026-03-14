/**
 * clientValidator.js — Validation Rules for Client Endpoints
 *
 * Wired into clientRoutes.js before controller functions.
 *
 *   router.post("/", createClientRules, clientController.createClient);
 *
 * updateClient (PUT /:id) does its own partial-update validation in the
 * controller — all fields are optional, so there is nothing to require
 * unconditionally at the request boundary.
 */

const { validate } = require("../middlewares/validateMiddleware");

// ─── POST /api/clients ────────────────────────────────────────────────────────
// Three fields are required to open a new client record.
// price must be a positive number (min: 0 means value must be > 0).
// photoFormat and notes are optional — the controller applies defaults.
const createClientRules = validate([
  {
    field:    "clientName",
    required: true,
    message:  "clientName is required",
  },
  {
    field:    "phone",
    required: true,
    message:  "phone is required",
  },
  {
    field:    "price",
    required: true,
    type:     "number",
    min:      0,       // exclusive: value must be strictly greater than 0
    message:  "price must be a positive number greater than zero",
  },
]);

module.exports = { createClientRules };

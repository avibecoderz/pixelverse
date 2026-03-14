/**
 * validateMiddleware.js — Reusable Request Body Validation
 *
 * Provides a single `validate(rules)` factory.
 * Pass it an array of rule objects → get back an Express middleware that runs
 * all checks BEFORE your controller is called.
 *
 * If any rule fails the middleware immediately returns a 400 JSON response —
 * the controller never runs.  If all rules pass, `next()` is called and the
 * request continues to the controller as normal.
 *
 * ─── Supported rule properties ───────────────────────────────────────────────
 *
 *   field     {string}    The req.body key to check (e.g. "email")
 *   required  {boolean}   Must be present and non-blank.  Default: false
 *   type      {string}    "email" | "number"  (no type check when omitted)
 *   min       {number}    For "number" type: value must be STRICTLY GREATER
 *                         than this.  Use min: 0 to require a positive number.
 *   minLength {number}    Minimum character count (after trimming whitespace).
 *   enum      {string[]}  Value must be one of these exact strings.
 *   message   {string}    Custom error message (overrides the default).
 *
 * ─── Example ─────────────────────────────────────────────────────────────────
 *
 *   const { validate } = require("../middlewares/validateMiddleware");
 *
 *   const loginRules = validate([
 *     { field: "email",    required: true, type: "email" },
 *     { field: "password", required: true },
 *     { field: "role",     required: true, enum: ["admin", "staff"] },
 *   ]);
 *
 *   router.post("/login", loginRules, authController.login);
 *
 * ─── How it works with optional fields ──────────────────────────────────────
 *
 *   When `required` is false (or omitted) and the field is absent / blank,
 *   ALL further checks (type, min, minLength, enum) are skipped.
 *   This lets you validate the FORMAT of an optional field only when it is
 *   actually provided — which is the right behaviour for partial updates.
 *
 * ─── Design notes ────────────────────────────────────────────────────────────
 *
 *   · No external validation library — pure Node.js / Express.
 *   · Controllers keep their own ownership and business-logic guards —
 *     this layer only validates the SHAPE of the incoming data.
 *   · Rules are checked in array order.  The FIRST failing rule returns
 *     immediately; subsequent rules are not evaluated.
 */

const { error } = require("../utils/responseUtils");

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Basic email format check — no external library required.
 * Verifies: text @ text . text (with no spaces anywhere).
 * Good enough for a studio management system; covers all real-world email forms.
 */
const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

// ─── validate(rules) ──────────────────────────────────────────────────────────

/**
 * Factory: returns an Express middleware that enforces the given rules.
 *
 * @param {Array<object>} rules  See property list above.
 * @returns {Function}           Express (req, res, next) middleware.
 */
const validate = (rules) => (req, res, next) => {
  for (const rule of rules) {
    // Normalise the raw body value to a trimmed string for uniform checks.
    // undefined / null both become an empty string so we never throw on String().
    const raw     = req.body[rule.field];
    const value   = (raw === undefined || raw === null) ? "" : String(raw).trim();
    const isEmpty = value.length === 0;

    // ── 1. Required check ─────────────────────────────────────────────────────
    // A field is "required" when it must be present AND non-blank.
    if (rule.required && isEmpty) {
      return error(
        res,
        rule.message || `${rule.field} is required`,
        400
      );
    }

    // ── Skip remaining checks when the value is absent / blank ────────────────
    // Only required fields have already been caught above.
    // Optional fields that are not provided are silently skipped here.
    if (isEmpty) continue;

    // ── 2. Email format ───────────────────────────────────────────────────────
    if (rule.type === "email" && !isValidEmail(value)) {
      return error(
        res,
        rule.message || `${rule.field} must be a valid email address`,
        400
      );
    }

    // ── 3. Number type + minimum value ───────────────────────────────────────
    if (rule.type === "number") {
      const num = parseFloat(value);

      if (isNaN(num)) {
        return error(
          res,
          rule.message || `${rule.field} must be a valid number`,
          400
        );
      }

      // `min` is EXCLUSIVE — value must be STRICTLY GREATER THAN rule.min.
      // Use min: 0 to require a positive number (value > 0).
      if (rule.min !== undefined && num <= rule.min) {
        return error(
          res,
          rule.message || `${rule.field} must be greater than ${rule.min}`,
          400
        );
      }
    }

    // ── 4. Minimum string length ──────────────────────────────────────────────
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return error(
        res,
        rule.message || `${rule.field} must be at least ${rule.minLength} characters`,
        400
      );
    }

    // ── 5. Enum allow-list ────────────────────────────────────────────────────
    if (rule.enum && !rule.enum.includes(value)) {
      return error(
        res,
        rule.message || `${rule.field} must be one of: ${rule.enum.join(", ")}`,
        400
      );
    }
  }

  // All rules passed — hand control to the next middleware or controller
  next();
};

module.exports = { validate };

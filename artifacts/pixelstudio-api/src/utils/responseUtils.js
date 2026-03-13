/**
 * responseUtils.js — Standardized API Response Helpers
 *
 * Every API response follows the same shape so the frontend
 * always knows what to expect:
 *
 *   Success: { success: true,  message: "...", data: { ... } }
 *   Error:   { success: false, message: "..." }
 *
 * Usage in controllers:
 *   return success(res, "Staff fetched", staffArray);
 *   return error(res, "Staff not found", 404);
 */

/**
 * Send a successful JSON response.
 * @param {object} res        - Express response object
 * @param {string} message    - Human-readable success message
 * @param {*}      data       - The response data (optional)
 * @param {number} statusCode - HTTP status code (default 200)
 */
const success = (res, message, data = null, statusCode = 200) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Send an error JSON response.
 * @param {object} res        - Express response object
 * @param {string} message    - Human-readable error message
 * @param {number} statusCode - HTTP status code (default 400)
 */
const error = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

module.exports = { success, error };

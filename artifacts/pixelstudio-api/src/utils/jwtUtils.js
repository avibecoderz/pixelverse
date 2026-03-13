/**
 * jwtUtils.js — JSON Web Token Helpers
 *
 * Two simple functions:
 *   signToken(payload)  → creates a token
 *   verifyToken(token)  → decodes and verifies a token
 *
 * The secret and expiry are read from .env.
 */

const jwt = require("jsonwebtoken");

const SECRET  = process.env.JWT_SECRET || "fallback_secret_change_in_production";
const EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Create a signed JWT token.
 * @param {object} payload - data to encode (e.g. { id, role })
 * @returns {string} signed token string
 */
const signToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
};

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload, or null if invalid/expired.
 * @param {string} token
 * @returns {object|null}
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    // Token is expired, tampered with, or invalid — return null
    return null;
  }
};

module.exports = { signToken, verifyToken };

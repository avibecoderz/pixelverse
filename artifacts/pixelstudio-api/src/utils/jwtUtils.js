/**
 * jwtUtils.js — JSON Web Token Utilities
 *
 * Provides two functions used throughout the auth layer:
 *
 *   signToken(payload)  — creates a signed JWT containing the payload data
 *   verifyToken(token)  — verifies a token and returns its decoded payload,
 *                         or null if the token is invalid or expired
 *
 * Configuration (set in your .env file):
 *   JWT_SECRET      — the secret key used to sign/verify tokens
 *                     IMPORTANT: use a long, random string in production
 *                     e.g. openssl rand -base64 64
 *   JWT_EXPIRES_IN  — how long tokens are valid (default: "7d")
 *                     Examples: "1h", "12h", "7d", "30d"
 *
 * The token payload typically looks like:
 *   { id: "uuid-string", role: "admin", iat: 1712345678, exp: 1712950478 }
 *   `iat` = issued at, `exp` = expires at — added automatically by jsonwebtoken
 */

const jwt = require("jsonwebtoken");

// Read config from environment variables — fall back to safe development defaults
const SECRET  = process.env.JWT_SECRET     || "dev_fallback_secret_change_me_in_production";
const EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Creates and signs a JWT token.
 *
 * @param {object} payload - Data to embed in the token. Typically { id, role }.
 *                           Keep this small — it's included in every request header.
 * @returns {string} A signed JWT string (e.g. "eyJhbGci...")
 *
 * @example
 * const token = signToken({ id: user.id, role: "staff" });
 * // → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
const signToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
};

/**
 * Verifies a JWT token and returns its decoded payload.
 * Returns null instead of throwing — the caller decides how to handle failure.
 *
 * @param {string} token - The raw JWT string from the Authorization header
 * @returns {object|null} The decoded payload, or null if invalid/expired
 *
 * @example
 * const decoded = verifyToken("eyJhbGci...");
 * if (!decoded) { ... handle invalid token ... }
 * // decoded → { id: "uuid", role: "admin", iat: 123, exp: 456 }
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    // Possible reasons for failure:
    //   TokenExpiredError — the exp timestamp is in the past
    //   JsonWebTokenError — signature is invalid or token is malformed
    //   NotBeforeError    — the nbf claim has not been reached
    // We treat all of these as "invalid token" and return null.
    return null;
  }
};

module.exports = { signToken, verifyToken };

/**
 * authMiddleware.js — JWT Token Verification Middleware
 *
 * Place this middleware BEFORE any route handler that requires a logged-in user.
 * It reads the JWT token from the Authorization header, verifies its signature
 * and expiry, and attaches the decoded payload to req.user.
 *
 * After this middleware runs successfully, every downstream handler can access:
 *   req.user.id    — the logged-in user's database ID (UUID string)
 *   req.user.role  — "admin" or "staff" (lowercase)
 *   req.user.iat   — token issued-at timestamp (set automatically by JWT)
 *   req.user.exp   — token expiry timestamp (set automatically by JWT)
 *
 * Usage — protect an entire router:
 *   router.use(authMiddleware);
 *
 * Usage — protect a single route:
 *   router.get("/profile", authMiddleware, profileController.getProfile);
 *
 * Usage — protect + restrict to a role:
 *   router.use(authMiddleware, roleMiddleware("admin"));
 *
 * The frontend must send the token in every request like this:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const { verifyToken } = require("../utils/jwtUtils");
const { error }       = require("../utils/responseUtils");

const authMiddleware = (req, res, next) => {
  // ── Step 1: Read the Authorization header ─────────────────────────────────
  // The header must be exactly: "Bearer <token>"
  // If it's missing or malformed, reject immediately.
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return error(res, "Access denied. No authorization token was provided.", 401);
  }

  if (!authHeader.startsWith("Bearer ")) {
    return error(
      res,
      "Invalid token format. Use: Authorization: Bearer <your-token>",
      401
    );
  }

  // ── Step 2: Extract the raw token string ──────────────────────────────────
  // Split on the space and take the second part: "Bearer abc123" → "abc123"
  const token = authHeader.split(" ")[1];

  if (!token || token.trim() === "") {
    return error(res, "Access denied. Token is empty.", 401);
  }

  // ── Step 3: Verify the token ──────────────────────────────────────────────
  // verifyToken returns the decoded payload on success, or null if:
  //   - The token has expired (exp is in the past)
  //   - The signature is invalid (tampered with)
  //   - The secret key doesn't match
  const decoded = verifyToken(token);

  if (!decoded) {
    return error(
      res,
      "Invalid or expired token. Please log in again.",
      401
    );
  }

  // ── Step 4: Attach user info to the request ───────────────────────────────
  // All downstream middleware and route handlers can now read req.user
  req.user = decoded; // { id, role, iat, exp }

  // ── Step 5: Continue to the next handler ─────────────────────────────────
  next();
};

module.exports = authMiddleware;

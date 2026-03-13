/**
 * authMiddleware.js — JWT Token Verification
 *
 * Runs before any protected route handler.
 * It reads the JWT token from the Authorization header,
 * verifies it, and attaches the user info to req.user.
 *
 * Usage in routes: router.use(authMiddleware)
 * or per-route:    router.get("/...", authMiddleware, handler)
 */

const { verifyToken } = require("../utils/jwtUtils");
const { error }       = require("../utils/responseUtils");

const authMiddleware = (req, res, next) => {
  // The frontend sends the token in the header like:
  // Authorization: Bearer eyJhbGci...
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return error(res, "Access denied. No token provided.", 401);
  }

  // Extract the token part (remove "Bearer ")
  const token = authHeader.split(" ")[1];

  // Verify the token — throws if expired or invalid
  const decoded = verifyToken(token);

  if (!decoded) {
    return error(res, "Invalid or expired token. Please log in again.", 401);
  }

  // Attach user info so route handlers can access it via req.user
  // e.g. req.user.id, req.user.role
  req.user = decoded;

  // Continue to the next middleware or route handler
  next();
};

module.exports = authMiddleware;

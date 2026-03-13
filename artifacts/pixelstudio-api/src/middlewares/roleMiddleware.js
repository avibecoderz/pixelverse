/**
 * roleMiddleware.js — Role-Based Access Control
 *
 * Restricts routes to specific roles (e.g. only "admin").
 * Must be used AFTER authMiddleware (which sets req.user).
 *
 * Usage:
 *   router.use(authMiddleware);
 *   router.use(roleMiddleware("admin")); // only admins get through
 */

const { error } = require("../utils/responseUtils");

/**
 * Returns a middleware function that checks if the logged-in user
 * has one of the allowed roles.
 *
 * @param {...string} allowedRoles - e.g. roleMiddleware("admin") or roleMiddleware("admin", "staff")
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by authMiddleware
    if (!req.user) {
      return error(res, "Not authenticated", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(
        res,
        `Access denied. Required role: ${allowedRoles.join(" or ")}`,
        403
      );
    }

    next();
  };
};

module.exports = roleMiddleware;

/**
 * roleMiddleware.js — Role-Based Access Control Middleware
 *
 * Restricts a route to users who have a specific role.
 * MUST be used AFTER authMiddleware, because it depends on req.user being set.
 *
 * How it works:
 *   You call roleMiddleware() with one or more allowed role strings.
 *   It returns a middleware function that checks req.user.role against them.
 *   If the user's role is not in the allowed list, a 403 Forbidden is returned.
 *
 * ─── Usage examples ───────────────────────────────────────────────────────────
 *
 * 1. Restrict an entire router to admins only:
 *      router.use(authMiddleware);
 *      router.use(roleMiddleware("admin"));
 *
 * 2. Restrict a single route to admins only:
 *      router.delete("/:id", authMiddleware, roleMiddleware("admin"), handler);
 *
 * 3. Allow both admin AND staff to access a route:
 *      router.get("/", authMiddleware, roleMiddleware("admin", "staff"), handler);
 *
 * ─── Role values ─────────────────────────────────────────────────────────────
 *   "admin" — full system access (set when the JWT is created during login)
 *   "staff" — limited access to own clients/photos/invoices only
 *
 * These strings must match the `role` value stored inside the JWT token,
 * which is always lowercase ("admin" / "staff") as set in authController.login.
 */

const { error } = require("../utils/responseUtils");

/**
 * @param {...string} allowedRoles - One or more role strings to allow through.
 * @returns {Function} Express middleware function
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // ── Guard: authMiddleware must have run first ──────────────────────────────
    // If req.user is not set, the routes are configured incorrectly.
    if (!req.user) {
      return error(
        res,
        "Authentication required. Add authMiddleware before roleMiddleware.",
        401
      );
    }

    // ── Check the user's role against the allowed list ────────────────────────
    // req.user.role is the lowercase role from the JWT payload ("admin"/"staff")
    // allowedRoles is the list passed to roleMiddleware(...) at route setup time
    const hasPermission = allowedRoles.includes(req.user.role);

    if (!hasPermission) {
      // Build a clear error message listing what role IS required
      const required = allowedRoles.join(" or ");
      return error(
        res,
        `Access denied. This action requires the '${required}' role. You are logged in as '${req.user.role}'.`,
        403
      );
    }

    // ── Role is valid — continue ───────────────────────────────────────────────
    next();
  };
};

module.exports = roleMiddleware;

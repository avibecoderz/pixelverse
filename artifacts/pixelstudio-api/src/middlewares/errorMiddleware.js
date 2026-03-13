/**
 * errorMiddleware.js — Global Error Handler
 *
 * This is the LAST middleware registered in app.js.
 * It catches any error passed via next(err) from route handlers.
 *
 * Instead of crashing or leaking stack traces to the client,
 * it returns a clean JSON error response.
 */

const errorMiddleware = (err, req, res, next) => {
  // Log the full error on the server for debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // Prisma-specific error: record not found (e.g. delete non-existent ID)
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found",
    });
  }

  // Prisma-specific error: unique constraint violation (e.g. duplicate email)
  if (err.code === "P2002") {
    const field = err.meta?.target || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // Default: internal server error
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development (never in production)
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;

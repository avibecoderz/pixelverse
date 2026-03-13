/**
 * paymentController.js — Payment Logic
 *
 * Admin views all payments. Staff views and records payments for their own clients.
 * FIX: Added client existence check before updating to prevent Prisma crashes.
 */

const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/payments ────────────────────────────────────────────────────────
// Returns one payment summary row per client record.
// Admin sees all. Staff sees only their own.
const getAllPayments = async (req, res, next) => {
  try {
    const where = req.user.role === "staff"
      ? { staffId: req.user.id }
      : {};

    const payments = await prisma.client.findMany({
      where,
      select: {
        id:            true,
        clientName:    true,
        price:         true,
        paymentStatus: true,
        orderStatus:   true,
        invoiceId:     true,
        createdAt:     true,
        staff: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(res, "Payments fetched", payments);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/payments/:clientId ────────────────────────────────────────────
// Marks a client's payment as PAID and updates the linked invoice (if any).
// FIX: Now checks if the client exists before attempting update.
const markAsPaid = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    // Verify the client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Staff can only record payments for their own clients
    if (req.user.role === "staff" && client.staffId !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    if (client.paymentStatus === "PAID") {
      return error(res, "This client's payment is already marked as PAID.", 409);
    }

    // Update the client's payment status
    const updated = await prisma.client.update({
      where: { id: clientId },
      data:  { paymentStatus: "PAID" },
    });

    // If an invoice exists for this client, mark it as paid too
    await prisma.invoice.updateMany({
      where: { clientId },
      data:  { status: "PAID", paidAt: new Date() },
    });

    return success(res, "Payment recorded as Paid", updated);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPayments, markAsPaid };

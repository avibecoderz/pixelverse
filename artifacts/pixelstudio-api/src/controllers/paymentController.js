/**
 * paymentController.js — Payment Logic
 *
 * Uses the real `payments` table from the schema (prisma.payment).
 * Previous version incorrectly queried the clients table as a payment summary.
 *
 * Schema changes reflected here:
 *   prisma.client.findMany() → prisma.payment.findMany()
 *   staffId                  → client.createdById
 *   staff relation           → client.createdBy
 *   invoice.paidAt           → removed (field doesn't exist in new Invoice model)
 *   invoice.status           → invoice.paymentStatus
 */

const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/payments ────────────────────────────────────────────────────────
// Returns all Payment records.
// Admin sees every payment. Staff sees only payments for their own clients.
const getAllPayments = async (req, res, next) => {
  try {
    // Filter through the client relation to limit to this staff member's clients
    const where = req.user.role === "staff"
      ? { client: { createdById: req.user.id } }
      : {};

    const payments = await prisma.payment.findMany({
      where,
      include: {
        client:     { select: { clientName: true, phone: true } },
        receivedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(res, "Payments fetched", payments);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/:id ────────────────────────────────────────────────────
// Get a single payment record.
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where:   { id: req.params.id },
      include: {
        client:     { select: { clientName: true, createdById: true } },
        receivedBy: { select: { name: true } },
      },
    });

    if (!payment) return error(res, "Payment not found", 404);

    if (req.user.role === "staff" && payment.client.createdById !== req.user.id) {
      return error(res, "Access denied.", 403);
    }

    return success(res, "Payment fetched", payment);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/:clientId ────────────────────────────────────────────
// Records a payment for a client. Creates a Payment row in the payments table.
// Also updates client.paymentStatus and any pending invoices for this client.
const recordPayment = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { amount }   = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return error(res, "amount must be a positive number", 400);
    }

    // Verify the client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Ownership check
    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    // Create the payment record in the payments table
    const payment = await prisma.payment.create({
      data: {
        amount:      parseFloat(amount),
        status:      "PAID",
        clientId,
        receivedById: req.user.id, // the staff member recording the payment
      },
    });

    // Update client.paymentStatus to PAID (marks the overall session as paid)
    await prisma.client.update({
      where: { id: clientId },
      data:  { paymentStatus: "PAID" },
    });

    // Mark all PENDING invoices for this client as PAID.
    // Uses updateMany because there can now be multiple invoices per client.
    await prisma.invoice.updateMany({
      where: { clientId, paymentStatus: "PENDING" },
      data:  { paymentStatus: "PAID" },
    });

    return success(res, "Payment recorded successfully", payment, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPayments, getPaymentById, recordPayment };

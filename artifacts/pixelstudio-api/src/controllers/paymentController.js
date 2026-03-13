/**
 * paymentController.js — Payment Logic
 *
 * Admin views all payments.
 * Staff can mark a client's payment as Paid.
 */

const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// GET /api/payments
const getAllPayments = async (req, res, next) => {
  try {
    const where = req.user.role === "staff" ? { staffId: req.user.id } : {};

    // We treat each client record as a payment record
    const payments = await prisma.client.findMany({
      where,
      select: {
        id:            true,
        clientName:    true,
        price:         true,
        paymentStatus: true,
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

// PATCH /api/payments/:clientId — mark as Paid
const markAsPaid = async (req, res, next) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.clientId },
      data:  { paymentStatus: "PAID" },
    });

    // Also update the linked invoice if it exists
    await prisma.invoice.updateMany({
      where: { clientId: req.params.clientId },
      data:  { status: "PAID", paidAt: new Date() },
    });

    return success(res, "Payment marked as Paid", client);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPayments, markAsPaid };

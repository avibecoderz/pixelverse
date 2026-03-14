/**
 * paymentController.js — Payment Logic
 *
 * Records money received from a client toward their photography session.
 * One client can have multiple payment records (installments, deposits, etc.).
 *
 * Access rules:
 *   Staff — can record and view payments for their own clients only
 *   Admin — can view all payment records; can record for any client
 *
 * Auto-paid logic:
 *   When a payment is recorded, the system sums ALL confirmed payments for
 *   that client. If the total reaches or exceeds the session price, it
 *   automatically marks:
 *     · client.paymentStatus        → PAID
 *     · all pending invoices        → PAID  (via updateMany)
 *   If the total is still below the session price (partial/deposit), both
 *   client and invoices remain PENDING until further payments close the gap.
 *
 * Atomicity:
 *   The create + aggregate + conditional updates all run inside a Prisma
 *   $transaction so the database is never left in a half-updated state.
 */

const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── Shared select shape for full payment responses ───────────────────────────
// Used by getPaymentById and the post-transaction fetch in recordPayment.
// client.createdById is fetched for the ownership check and stripped before
// the response leaves this module — the frontend never sees it.
const FULL_PAYMENT_SELECT = {
  id:        true,
  amount:    true,
  status:    true,
  createdAt: true,
  client: {
    select: {
      id:            true,
      clientName:    true,
      phone:         true,
      price:         true,
      paymentStatus: true, // reflects current state after any transaction updates
      orderStatus:   true,
      createdById:   true, // ownership check — stripped before response
    },
  },
  receivedBy: {
    select: { id: true, name: true, email: true },
  },
};

// ─── Helper: strip internal FK + return clean payment object ─────────────────
// Removes client.createdById before sending to the frontend.
const formatPayment = (payment) => {
  const { createdById: _omit, ...clientData } = payment.client;
  return { ...payment, client: clientData };
};

// ─── GET /api/payments ────────────────────────────────────────────────────────
/**
 * List payment records.
 *   Admin → every payment in the system
 *   Staff → only payments for clients they created
 *
 * Uses a lighter select than the full payment shape (no price, no orderStatus)
 * since this is a list view — the full details are available via GET /:id.
 */
const getAllPayments = async (req, res, next) => {
  try {
    const where = req.user.role === "staff"
      ? { client: { createdById: req.user.id } }
      : {};

    const payments = await prisma.payment.findMany({
      where,
      select: {
        id:        true,
        amount:    true,
        status:    true,
        createdAt: true,
        client: {
          select: {
            id:        true,
            clientName: true,
            phone:     true,
          },
        },
        receivedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(res, "Payments fetched", payments);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/:id ────────────────────────────────────────────────────
/**
 * Get a single payment record with full client and receiver details.
 * Ownership: staff can only view payments for their own clients.
 */
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where:  { id: req.params.id },
      select: FULL_PAYMENT_SELECT,
    });

    if (!payment) return error(res, "Payment not found", 404);

    if (req.user.role === "staff" && payment.client.createdById !== req.user.id) {
      return error(
        res,
        "Access denied. This payment belongs to another staff member's client.",
        403
      );
    }

    return success(res, "Payment fetched", formatPayment(payment));
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/:clientId ─────────────────────────────────────────────
/**
 * Record a confirmed payment received from a client.
 *
 * Body (JSON):
 *   amount  {number}  required — the amount received, must be > 0
 *
 * The payment status is always set to PAID because this endpoint represents
 * money already in hand — it is not a payment request or pledge.
 *
 * After creating the payment row, the handler:
 *   1. Sums all PAID payments for this client (including the new one)
 *   2. Compares the total to client.price
 *   3. If total >= price: marks client.paymentStatus and all pending invoices PAID
 *   4. If total < price: leaves client and invoices as PENDING (partial payment)
 *
 * All four database operations run inside a single $transaction so the data
 * is always consistent even if the connection drops mid-way.
 *
 * Response includes a `summary` block with:
 *   totalPaid   — sum of all confirmed payments for this client
 *   sessionPrice— the agreed session price (client.price)
 *   balance     — how much is still outstanding (0 if fully paid)
 *   isFullyPaid — whether the client is now fully settled
 */
const recordPayment = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { amount }   = req.body;

    // ── Validate amount ───────────────────────────────────────────────────────
    // Use explicit checks (not !amount) so that a value of 0 produces the
    // "must be a positive number" message rather than "amount is required".
    if (amount === undefined || amount === null || amount === "") {
      return error(res, "amount is required", 400);
    }
    const resolvedAmount = parseFloat(amount);
    if (isNaN(resolvedAmount) || resolvedAmount <= 0) {
      return error(res, "amount must be a positive number", 400);
    }

    // ── Validate client and check ownership ───────────────────────────────────
    const client = await prisma.client.findUnique({
      where:  { id: clientId },
      select: { id: true, price: true, createdById: true },
    });

    if (!client) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(
        res,
        "Access denied. This client belongs to a different staff member.",
        403
      );
    }

    const sessionPrice = parseFloat(client.price);

    // ── Atomic transaction: create payment + conditional status updates ────────
    // All writes happen together. If any step fails, the entire transaction
    // rolls back — no orphaned payment rows, no half-updated client records.
    const paymentId = await prisma.$transaction(async (tx) => {
      // Step 1: Create the payment record
      const payment = await tx.payment.create({
        data: {
          amount:      resolvedAmount,
          status:      "PAID",    // recording received money — always PAID
          clientId,
          receivedById: req.user.id,
        },
        select: { id: true },
      });

      // Step 2: Sum ALL confirmed payments for this client, including the
      // new one just created. Using aggregate inside the transaction ensures
      // we read the post-insert total, not the pre-insert total.
      const aggregate = await tx.payment.aggregate({
        where: { clientId, status: "PAID" },
        _sum:  { amount: true },
      });

      const totalPaid  = parseFloat(aggregate._sum.amount || 0);
      const isFullyPaid = totalPaid >= sessionPrice;

      // Step 3: Update client and invoices only when fully settled
      if (isFullyPaid) {
        await tx.client.update({
          where: { id: clientId },
          data:  { paymentStatus: "PAID" },
        });

        // Mark all PENDING invoices for this client as PAID.
        // updateMany is correct here — there can be multiple invoices.
        await tx.invoice.updateMany({
          where: { clientId, paymentStatus: "PENDING" },
          data:  { paymentStatus: "PAID" },
        });
      }

      return payment.id;
    });

    // ── Fetch the created payment with fresh relational data ──────────────────
    // Done outside the transaction because we want the post-transaction state
    // of client.paymentStatus (which may have just been updated to PAID).
    const fullPayment = await prisma.payment.findUnique({
      where:  { id: paymentId },
      select: FULL_PAYMENT_SELECT,
    });

    // Re-read the total from the DB for the summary block.
    // This is a cheap aggregate query and ensures the summary is accurate
    // even if a concurrent payment was recorded between the transaction and now.
    const aggregate = await prisma.payment.aggregate({
      where: { clientId, status: "PAID" },
      _sum:  { amount: true },
    });
    const totalPaid  = parseFloat(aggregate._sum.amount || 0);
    const balance    = Math.max(0, sessionPrice - totalPaid);
    const isFullyPaid = totalPaid >= sessionPrice;

    return success(
      res,
      "Payment recorded successfully",
      {
        payment: formatPayment(fullPayment),
        summary: {
          totalPaid,
          sessionPrice,
          balance,
          isFullyPaid,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPayments, getPaymentById, recordPayment };

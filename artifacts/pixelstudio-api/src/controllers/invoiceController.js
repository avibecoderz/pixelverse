/**
 * invoiceController.js — Invoice Logic
 *
 * One client can now have MANY invoices (one-to-many, not one-to-one).
 * Staff generate invoices for their own clients. Admin can view all.
 *
 * Schema changes reflected here:
 *   issuedAt      → createdAt
 *   invoiceNo     → invoiceNumber
 *   status        → paymentStatus
 *   client.staffId → client.createdById
 *   staff          → createdBy (relation name)
 *   Invoice now requires createdById (FK to the staff who generated it)
 *   Invoice.clientId is no longer @unique — multiple invoices per client are allowed
 */

const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// Helper: generate a unique sequential invoice number e.g. "INV-0001"
// Counts all existing invoices and uses count + 1 as the next number.
const generateInvoiceNumber = async () => {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
};

// ─── GET /api/invoices ────────────────────────────────────────────────────────
// Admin sees all invoices. Staff sees only invoices for their own clients.
const getAllInvoices = async (req, res, next) => {
  try {
    // Filter by the client's creator — staff sees invoices for their own clients
    const where = req.user.role === "staff"
      ? { client: { createdById: req.user.id } }
      : {};

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            clientName: true,
            phone:      true,
            createdBy:  { select: { name: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" }, // field is createdAt, not issuedAt
    });

    return success(res, "Invoices fetched", invoices);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/invoices/:id ────────────────────────────────────────────────────
// Staff can only view invoices that belong to their own clients.
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where:   { id: req.params.id },
      include: {
        client:    { include: { createdBy: { select: { id: true, name: true } } } },
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) return error(res, "Invoice not found", 404);

    // Ownership check: staff can only view invoices for their own clients
    if (req.user.role === "staff" && invoice.client.createdBy.id !== req.user.id) {
      return error(res, "Access denied. This invoice belongs to another staff member's client.", 403);
    }

    return success(res, "Invoice fetched", invoice);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/invoices/:clientId ─────────────────────────────────────────────
// Generates a new invoice for a client.
// Multiple invoices per client are allowed (e.g. additional sessions, split billing).
const generateInvoice = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { amount }   = req.body; // optional override; defaults to client.price

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Ownership check
    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    // Generate a unique invoice number across all invoices in the system
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,                                         // e.g. "INV-0001"
        amount:        amount ? parseFloat(amount) : client.price, // default to session price
        paymentStatus: "PENDING",                              // always starts as pending
        clientId,
        createdById:   req.user.id,                           // the staff member creating it
      },
    });

    return success(res, "Invoice generated", invoice, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/invoices/:id/mark-paid ───────────────────────────────────────
// Marks a specific invoice as PAID.
const markInvoicePaid = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where:   { id: req.params.id },
      include: { client: { select: { createdById: true } } },
    });

    if (!invoice) return error(res, "Invoice not found", 404);

    if (req.user.role === "staff" && invoice.client.createdById !== req.user.id) {
      return error(res, "Access denied.", 403);
    }

    if (invoice.paymentStatus === "PAID") {
      return error(res, "This invoice is already marked as PAID.", 409);
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data:  { paymentStatus: "PAID" },
    });

    return success(res, "Invoice marked as paid", updated);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllInvoices, getInvoiceById, generateInvoice, markInvoicePaid };

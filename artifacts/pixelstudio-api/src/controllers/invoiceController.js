/**
 * invoiceController.js — Invoice Logic
 *
 * Staff generate invoices for their own clients.
 * Admin can view all invoices.
 * FIX: Added ownership checks to getInvoiceById.
 */

const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/invoices ────────────────────────────────────────────────────────
// Admin sees all invoices. Staff only sees invoices for their own clients.
const getAllInvoices = async (req, res, next) => {
  try {
    // Filter by the staff's own clients if the requester is staff
    const where = req.user.role === "staff"
      ? { client: { staffId: req.user.id } }
      : {};

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            clientName: true,
            phone:      true,
            staff:      { select: { name: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    return success(res, "Invoices fetched", invoices);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/invoices/:id ────────────────────────────────────────────────────
// FIX: Staff can only view invoices that belong to their own clients.
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where:   { id: req.params.id },
      include: {
        client: {
          include: { staff: { select: { id: true, name: true } } },
        },
      },
    });

    if (!invoice) return error(res, "Invoice not found", 404);

    // Staff can only view invoices for their own clients
    if (req.user.role === "staff" && invoice.client.staff.id !== req.user.id) {
      return error(res, "Access denied. This invoice belongs to another staff member's client.", 403);
    }

    return success(res, "Invoice fetched", invoice);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/invoices/:clientId ─────────────────────────────────────────────
// Generates an invoice for a client. One invoice per client — duplicates blocked.
const generateInvoice = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Staff can only generate invoices for their own clients
    if (req.user.role === "staff" && client.staffId !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    // Prevent duplicate invoices
    const existing = await prisma.invoice.findUnique({ where: { clientId } });
    if (existing) {
      return error(res, "An invoice already exists for this client. Use GET /api/invoices/:id to view it.", 409);
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: client.invoiceId,   // e.g. "INV-0001"
        amount:    client.price,
        status:    client.paymentStatus,
        clientId,
      },
    });

    return success(res, "Invoice generated", invoice, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllInvoices, getInvoiceById, generateInvoice };

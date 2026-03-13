/**
 * invoiceController.js — Invoice Logic
 *
 * Staff generate invoices for their clients.
 * One invoice per client.
 */

const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// GET /api/invoices — list all invoices
const getAllInvoices = async (req, res, next) => {
  try {
    const where = req.user.role === "staff" ? { client: { staffId: req.user.id } } : {};

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: { clientName: true, phone: true, staff: { select: { name: true } } },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    return success(res, "Invoices fetched", invoices);
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/:id — get one invoice
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { staff: { select: { name: true } } } } },
    });

    if (!invoice) return error(res, "Invoice not found", 404);
    return success(res, "Invoice fetched", invoice);
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices/:clientId — generate invoice for a client
const generateInvoice = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Prevent generating a duplicate invoice
    const existing = await prisma.invoice.findUnique({ where: { clientId } });
    if (existing) return error(res, "Invoice already exists for this client", 409);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: client.invoiceId,
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

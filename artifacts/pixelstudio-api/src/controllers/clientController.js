/**
 * clientController.js — Client Record Logic
 *
 * Staff create and manage client records.
 * Admin can view all clients.
 * Each client gets a unique gallery token for the public gallery link.
 */

const crypto = require("crypto");
const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// Helper: generate a short unique invoice number e.g. "INV-0042"
const generateInvoiceId = async () => {
  const count = await prisma.client.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
};

// GET /api/clients — admin sees all, staff sees only theirs
const getAllClients = async (req, res, next) => {
  try {
    const where = req.user.role === "staff" ? { staffId: req.user.id } : {};

    const clients = await prisma.client.findMany({
      where,
      include: {
        staff:  { select: { name: true } },
        photos: { select: { id: true, url: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(res, "Clients fetched", clients);
  } catch (err) {
    next(err);
  }
};

// GET /api/clients/:id — get full details of one client
const getClientById = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        staff:   { select: { name: true } },
        photos:  true,
        invoice: true,
      },
    });

    if (!client) return error(res, "Client not found", 404);

    // Staff can only see their own clients
    if (req.user.role === "staff" && client.staffId !== req.user.id) {
      return error(res, "Access denied", 403);
    }

    return success(res, "Client fetched", client);
  } catch (err) {
    next(err);
  }
};

// POST /api/clients — create a new client record
const createClient = async (req, res, next) => {
  try {
    const { clientName, phone, price, photoFormat, notes, shootDate } = req.body;

    if (!clientName || !phone || !price) {
      return error(res, "clientName, phone, and price are required", 400);
    }

    const invoiceId    = await generateInvoiceId();
    const galleryToken = crypto.randomBytes(16).toString("hex"); // unique share link

    const client = await prisma.client.create({
      data: {
        clientName,
        phone,
        price:        parseFloat(price),
        photoFormat:  photoFormat || "SOFTCOPY",
        notes:        notes || null,
        shootDate:    shootDate ? new Date(shootDate) : null,
        invoiceId,
        galleryToken,
        staffId:      req.user.id, // assigned to the logged-in staff
      },
    });

    return success(res, "Client record created", client, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/clients/:id — update a client record
const updateClient = async (req, res, next) => {
  try {
    const { clientName, phone, price, photoFormat, paymentStatus, orderStatus, notes } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data:  { clientName, phone, price: price ? parseFloat(price) : undefined, photoFormat, paymentStatus, orderStatus, notes },
    });

    return success(res, "Client updated", client);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/clients/:id — remove a client record (also deletes photos via cascade)
const deleteClient = async (req, res, next) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    return success(res, "Client record deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllClients, getClientById, createClient, updateClient, deleteClient };

/**
 * clientController.js — Client Record Logic
 *
 * Staff create and manage their own client records.
 * Admin can view all clients but cannot create/edit (read-only access).
 * Each client gets a unique galleryToken for the public photo-viewing link.
 */

const crypto = require("crypto");
const prisma  = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// Helper: generate a sequential invoice number e.g. "INV-0042"
// Note: in high-concurrency scenarios use a database sequence instead.
const generateInvoiceId = async () => {
  const count = await prisma.client.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
};

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// Admin sees all clients. Staff only sees their own.
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

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
// Staff can only view their own client's details.
const getClientById = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where:   { id: req.params.id },
      include: { staff: { select: { name: true } }, photos: true, invoice: true },
    });

    if (!client) return error(res, "Client not found", 404);

    // Staff ownership check
    if (req.user.role === "staff" && client.staffId !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    return success(res, "Client fetched", client);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/clients ────────────────────────────────────────────────────────
// Creates a new client record assigned to the logged-in staff member.
const createClient = async (req, res, next) => {
  try {
    const { clientName, phone, price, photoFormat, notes, shootDate } = req.body;

    if (!clientName || !phone || !price) {
      return error(res, "clientName, phone, and price are required", 400);
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return error(res, "price must be a positive number", 400);
    }

    const invoiceId    = await generateInvoiceId();
    // Generate a cryptographically random token for the share link (32 hex chars)
    const galleryToken = crypto.randomBytes(16).toString("hex");

    const client = await prisma.client.create({
      data: {
        clientName,
        phone,
        price:       parseFloat(price),
        photoFormat: photoFormat || "SOFTCOPY",
        notes:       notes       || null,
        shootDate:   shootDate   ? new Date(shootDate) : null,
        invoiceId,
        galleryToken,
        staffId: req.user.id, // always assigned to the creating staff member
      },
    });

    return success(res, "Client record created", client, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/clients/:id ─────────────────────────────────────────────────────
// FIX: Added ownership check — staff can only update their own clients.
const updateClient = async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Client not found", 404);

    // Staff can only edit clients they created
    if (req.user.role === "staff" && existing.staffId !== req.user.id) {
      return error(res, "Access denied. You can only update your own clients.", 403);
    }

    const { clientName, phone, price, photoFormat, paymentStatus, orderStatus, notes } = req.body;

    // Build update object with only the fields that were provided
    const updateData = {};
    if (clientName    !== undefined) updateData.clientName    = clientName;
    if (phone         !== undefined) updateData.phone         = phone;
    if (price         !== undefined) updateData.price         = parseFloat(price);
    if (photoFormat   !== undefined) updateData.photoFormat   = photoFormat;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (orderStatus   !== undefined) updateData.orderStatus   = orderStatus;
    if (notes         !== undefined) updateData.notes         = notes;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data:  updateData,
    });

    return success(res, "Client updated", client);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/clients/:id ──────────────────────────────────────────────────
// FIX: Added ownership check — staff can only delete their own clients.
// Admin can delete any client.
const deleteClient = async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && existing.staffId !== req.user.id) {
      return error(res, "Access denied. You can only delete your own clients.", 403);
    }

    // onDelete: Cascade on Photo and Invoice means they are auto-deleted too
    await prisma.client.delete({ where: { id: req.params.id } });
    return success(res, "Client record deleted");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/gallery/:token ──────────────────────────────────────────────────
// PUBLIC — no auth required. Used by clients to view/download their photos.
// The token was generated when the client record was created.
const getGalleryByToken = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { galleryToken: req.params.token },
      select: {
        id:          true,
        clientName:  true,
        orderStatus: true,
        shootDate:   true,
        photos: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        staff: { select: { name: true } },
      },
    });

    if (!client) {
      return error(res, "Gallery not found. The link may be invalid or expired.", 404);
    }

    // Only expose the gallery if photos are ready
    if (client.orderStatus === "PENDING" || client.orderStatus === "EDITING") {
      return error(
        res,
        "Your photos are not ready yet. Please check back later.",
        403
      );
    }

    return success(res, "Gallery loaded", client);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllClients, getClientById, createClient,
  updateClient, deleteClient, getGalleryByToken,
};

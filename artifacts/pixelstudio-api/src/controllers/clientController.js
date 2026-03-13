/**
 * clientController.js — Client Record Logic
 *
 * Staff create and manage their own client records.
 * Admin can view all clients.
 *
 * Schema changes reflected here:
 *   staffId      → createdById  (FK name changed)
 *   staff        → createdBy    (relation name changed)
 *   invoice      → invoices     (now one-to-many)
 *   photos.url   → photos.imageUrl
 *   invoiceId    → removed from Client model
 *   shootDate    → removed from Client model
 */

const crypto             = require("crypto");
const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// Admin sees all clients. Staff only sees records they created.
const getAllClients = async (req, res, next) => {
  try {
    // Filter by createdById for staff; no filter for admin
    const where = req.user.role === "staff"
      ? { createdById: req.user.id }
      : {};

    const clients = await prisma.client.findMany({
      where,
      include: {
        createdBy: { select: { name: true, email: true } },
        photos:    { select: { id: true, imageUrl: true } },
        invoices:  { select: { id: true, invoiceNumber: true, paymentStatus: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(res, "Clients fetched", clients);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
// Full details for one client. Staff can only view their own.
const getClientById = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where:   { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        gallery:   { include: { photos: { orderBy: { createdAt: "asc" } } } },
        invoices:  true,
        payments:  true,
      },
    });

    if (!client) return error(res, "Client not found", 404);

    // Staff ownership check — use createdById, not staffId
    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    return success(res, "Client fetched", client);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/clients ────────────────────────────────────────────────────────
// Creates a client record. Assigned to the logged-in staff member via createdById.
// galleryToken is generated here and later reused when a Gallery is created.
const createClient = async (req, res, next) => {
  try {
    const { clientName, phone, price, photoFormat, notes } = req.body;

    if (!clientName || !phone || !price) {
      return error(res, "clientName, phone, and price are required", 400);
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return error(res, "price must be a positive number", 400);
    }

    // Generate a cryptographically random 32-char hex token for the gallery share link
    const galleryToken = crypto.randomBytes(16).toString("hex");

    const client = await prisma.client.create({
      data: {
        clientName,
        phone,
        price:       parseFloat(price),
        photoFormat: photoFormat || "SOFTCOPY",
        notes:       notes       || null,
        galleryToken,
        createdById: req.user.id, // FK to users table (the logged-in staff)
      },
    });

    return success(res, "Client record created", client, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/clients/:id ─────────────────────────────────────────────────────
// Updates a client record. Staff can only update records they created.
const updateClient = async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Client not found", 404);

    // Ownership check
    if (req.user.role === "staff" && existing.createdById !== req.user.id) {
      return error(res, "Access denied. You can only update your own clients.", 403);
    }

    const { clientName, phone, price, photoFormat, paymentStatus, orderStatus, notes } = req.body;

    // Only include fields that were actually sent in the request
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
// Staff can only delete their own clients. Admin can delete any.
// Cascade rules in schema auto-delete the linked gallery, photos, invoices, payments.
const deleteClient = async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && existing.createdById !== req.user.id) {
      return error(res, "Access denied. You can only delete your own clients.", 403);
    }

    await prisma.client.delete({ where: { id: req.params.id } });
    return success(res, "Client record deleted");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/gallery/:token ──────────────────────────────────────────────────
// PUBLIC — no authentication required.
// Looks up the Gallery by its token and returns the photos inside.
// If the order is not yet READY or DELIVERED, the client is shown a "not ready" message.
const getGalleryByToken = async (req, res, next) => {
  try {
    // Look up the Gallery directly by its unique token
    const gallery = await prisma.gallery.findUnique({
      where: { token: req.params.token },
      include: {
        client: {
          select: {
            clientName:  true,
            orderStatus: true,
            createdBy:   { select: { name: true } },
          },
        },
        photos: {
          select:  { id: true, imageUrl: true, fileName: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!gallery) {
      return error(res, "Gallery not found. The link may be invalid or expired.", 404);
    }

    // Photos are only visible when editing is complete
    const { orderStatus } = gallery.client;
    if (orderStatus === "PENDING" || orderStatus === "EDITING") {
      return error(res, "Your photos are not ready yet. Please check back later.", 403);
    }

    return success(res, "Gallery loaded", {
      galleryId:    gallery.id,
      clientName:   gallery.client.clientName,
      photographerName: gallery.client.createdBy.name,
      orderStatus,
      photos:       gallery.photos,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllClients, getClientById, createClient,
  updateClient, deleteClient, getGalleryByToken,
};

/**
 * clientController.js — Client Management Logic
 *
 * A client record is the central object in PixelStudio. Every gallery,
 * photo, invoice, and payment links back to a client.
 *
 * Access rules:
 *   Staff  — can create clients and manage only the ones they created
 *   Admin  — can view and manage all clients
 *
 * The `createdById` FK links every client to the staff member who booked them.
 * All ownership checks compare this field against req.user.id from the JWT.
 */

const crypto             = require("crypto");
const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── Enum allow-lists ─────────────────────────────────────────────────────────
// These match the Prisma schema enums exactly (uppercase).
// Validating here gives the caller a clear error message instead of letting
// Prisma throw an unhandled exception with a cryptic internal message.

const VALID_PHOTO_FORMATS    = ["SOFTCOPY", "HARDCOPY", "BOTH"];
const VALID_PAYMENT_STATUSES = ["PENDING", "PAID"];
const VALID_ORDER_STATUSES   = ["PENDING", "EDITING", "READY", "DELIVERED"];

// ─── Relation shape for list responses ───────────────────────────────────────
// Used in getAllClients — lightweight summary per client.
// Photos are NOT included in full — only a count is returned so the list
// doesn't explode in size when clients have hundreds of uploaded images.

const CLIENT_LIST_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  invoices:  { select: { id: true, invoiceNumber: true, paymentStatus: true, amount: true } },
  _count:    { select: { photos: true, invoices: true, payments: true } },
};

// ─── Relation shape for detail responses ─────────────────────────────────────
// Used in getClientById — returns everything for the client detail page.
// Photos come through the gallery so they are displayed in the correct order.

const CLIENT_DETAIL_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  gallery: {
    include: {
      photos: {
        select:  { id: true, imageUrl: true, fileName: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  },
  invoices: {
    orderBy: { createdAt: "desc" },
  },
  payments: {
    orderBy: { createdAt: "desc" },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Trim a string value and return null if it is blank.
 * Prevents whitespace-only values from reaching the database.
 */
const trimOrNull = (value) => {
  if (value === undefined || value === null) return undefined; // not provided
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

// ─── GET /api/clients ─────────────────────────────────────────────────────────
/**
 * Returns a list of clients with summary info (no full photo arrays).
 *
 * Admin  → sees every client in the system.
 * Staff  → sees only the clients they created (filtered by createdById).
 *
 * Optional query filters:
 *   ?orderStatus=EDITING      → filter by workflow stage
 *   ?paymentStatus=PENDING    → filter by payment state
 */
const getAllClients = async (req, res, next) => {
  try {
    const where = {};

    // Staff only see their own clients
    if (req.user.role === "staff") {
      where.createdById = req.user.id;
    }

    // Optional query string filters — validated against allow-lists
    if (req.query.orderStatus) {
      if (!VALID_ORDER_STATUSES.includes(req.query.orderStatus)) {
        return error(res, `orderStatus must be one of: ${VALID_ORDER_STATUSES.join(", ")}`, 400);
      }
      where.orderStatus = req.query.orderStatus;
    }

    if (req.query.paymentStatus) {
      if (!VALID_PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
        return error(res, `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`, 400);
      }
      where.paymentStatus = req.query.paymentStatus;
    }

    const clients = await prisma.client.findMany({
      where,
      include: CLIENT_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return success(res, `${clients.length} client(s) found`, clients);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
/**
 * Returns full detail for a single client including their gallery and photos.
 *
 * Staff ownership is enforced — a staff member cannot view another
 * staff member's client even if they know the ID.
 */
const getClientById = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where:   { id: req.params.id },
      include: CLIENT_DETAIL_INCLUDE,
    });

    if (!client) return error(res, "Client not found", 404);

    // Staff can only view clients they personally created
    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    return success(res, "Client fetched", client);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/clients ────────────────────────────────────────────────────────
/**
 * Creates a new client record.
 * The logged-in staff member (or admin) is automatically set as the creator.
 *
 * Required body fields: { clientName, phone, price }
 * Optional body fields: { photoFormat, notes }
 *
 * paymentStatus and orderStatus are always defaulted to PENDING on creation —
 * they are managed by the workflow (payments module, order status updates).
 *
 * A unique galleryToken is generated here. It is stored on the client record
 * and later reused as gallery.token when photos are first uploaded.
 * The share link sent to the customer uses this token:
 *   e.g. https://pixelstudio.ng/gallery/<token>
 */
const createClient = async (req, res, next) => {
  try {
    const { price, photoFormat, notes } = req.body;

    // ── Required fields ───────────────────────────────────────────────────────
    const clientName = trimOrNull(req.body.clientName);
    const phone      = trimOrNull(req.body.phone);

    if (!clientName) return error(res, "clientName is required and must not be blank", 400);
    if (!phone)      return error(res, "phone is required and must not be blank",      400);

    // ── Price validation ──────────────────────────────────────────────────────
    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      return error(res, "price must be a positive number greater than zero", 400);
    }

    // ── PhotoFormat validation ────────────────────────────────────────────────
    // Must be one of the schema enum values. Default to SOFTCOPY if omitted.
    const resolvedFormat = photoFormat || "SOFTCOPY";
    if (!VALID_PHOTO_FORMATS.includes(resolvedFormat)) {
      return error(res, `photoFormat must be one of: ${VALID_PHOTO_FORMATS.join(", ")}`, 400);
    }

    // ── Generate gallery token ────────────────────────────────────────────────
    // 16 random bytes → 32-character hex string. Cryptographically secure,
    // extremely unlikely to collide even with thousands of clients.
    const galleryToken = crypto.randomBytes(16).toString("hex");

    // ── Create the record ─────────────────────────────────────────────────────
    const client = await prisma.client.create({
      data: {
        clientName,
        phone,
        price:       parsedPrice,
        photoFormat: resolvedFormat,
        notes:       notes ? String(notes).trim() || null : null,
        galleryToken,
        createdById: req.user.id, // set from the JWT — cannot be overridden by the body
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return success(res, "Client record created", client, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/clients/:id ─────────────────────────────────────────────────────
/**
 * Updates a client record. Only the fields present in the request body are changed.
 *
 * Staff can update: clientName, phone, price, photoFormat, orderStatus, notes
 * Admin can also update: paymentStatus
 *
 * paymentStatus is restricted from staff because it is managed by the payments
 * module — recording a payment via POST /api/payments/:clientId updates it
 * automatically. Allowing staff to set it directly would bypass that flow.
 *
 * galleryToken and createdById can never be changed after creation.
 */
const updateClient = async (req, res, next) => {
  try {
    const clientId = req.params.id;

    // ── Ownership check ───────────────────────────────────────────────────────
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && existing.createdById !== req.user.id) {
      return error(res, "Access denied. You can only update your own clients.", 403);
    }

    // ── Build the update object ───────────────────────────────────────────────
    const updateData = {};

    // String fields — trim and reject blank values
    const clientName = trimOrNull(req.body.clientName);
    const phone      = trimOrNull(req.body.phone);

    if (req.body.clientName !== undefined) {
      if (!clientName) return error(res, "clientName must not be blank", 400);
      updateData.clientName = clientName;
    }
    if (req.body.phone !== undefined) {
      if (!phone) return error(res, "phone must not be blank", 400);
      updateData.phone = phone;
    }

    // Price — must be a positive number if provided
    if (req.body.price !== undefined) {
      const parsedPrice = parseFloat(req.body.price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return error(res, "price must be a positive number greater than zero", 400);
      }
      updateData.price = parsedPrice;
    }

    // Enum fields — validate against allow-lists before touching the DB
    if (req.body.photoFormat !== undefined) {
      if (!VALID_PHOTO_FORMATS.includes(req.body.photoFormat)) {
        return error(res, `photoFormat must be one of: ${VALID_PHOTO_FORMATS.join(", ")}`, 400);
      }
      updateData.photoFormat = req.body.photoFormat;
    }

    if (req.body.orderStatus !== undefined) {
      if (!VALID_ORDER_STATUSES.includes(req.body.orderStatus)) {
        return error(res, `orderStatus must be one of: ${VALID_ORDER_STATUSES.join(", ")}`, 400);
      }
      updateData.orderStatus = req.body.orderStatus;
    }

    // paymentStatus — admin only.
    // Staff must use the payments module to change payment state.
    if (req.body.paymentStatus !== undefined) {
      if (req.user.role === "staff") {
        return error(
          res,
          "Staff cannot set paymentStatus directly. Use the payments module to record a payment.",
          403
        );
      }
      if (!VALID_PAYMENT_STATUSES.includes(req.body.paymentStatus)) {
        return error(res, `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`, 400);
      }
      updateData.paymentStatus = req.body.paymentStatus;
    }

    // Notes — allow explicitly clearing to null by sending null or empty string
    if (req.body.notes !== undefined) {
      const trimmedNotes = req.body.notes ? String(req.body.notes).trim() : null;
      updateData.notes = trimmedNotes || null;
    }

    // ── Guard against empty update ────────────────────────────────────────────
    if (Object.keys(updateData).length === 0) {
      return error(res, "No valid fields were provided to update", 400);
    }

    const client = await prisma.client.update({
      where:   { id: clientId },
      data:    updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return success(res, "Client updated", client);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/clients/:id ──────────────────────────────────────────────────
/**
 * Permanently deletes a client record.
 * The schema cascades the delete to: gallery → photos, invoices, payments.
 * Staff can only delete their own clients. Admin can delete any.
 */
const deleteClient = async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && existing.createdById !== req.user.id) {
      return error(res, "Access denied. You can only delete your own clients.", 403);
    }

    await prisma.client.delete({ where: { id: req.params.id } });
    return success(res, `Client record for "${existing.clientName}" has been deleted`);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/gallery/:token ──────────────────────────────────────────────────
/**
 * PUBLIC endpoint — no authentication required.
 * This is what the studio sends to the customer as their photo delivery link.
 *
 * Looks up the Gallery by its unique token and returns the photos inside.
 * Returns 403 if the order is still PENDING or EDITING (not ready for delivery).
 */
const getGalleryByToken = async (req, res, next) => {
  try {
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

    const { orderStatus } = gallery.client;

    // Block access if the order hasn't reached the delivery stage yet
    if (orderStatus === "PENDING" || orderStatus === "EDITING") {
      return error(
        res,
        "Your photos are not ready yet. We will notify you when they are available.",
        403
      );
    }

    return success(res, "Gallery loaded", {
      galleryId:        gallery.id,
      clientName:       gallery.client.clientName,
      photographerName: gallery.client.createdBy.name,
      orderStatus,
      photoCount:       gallery.photos.length,
      photos:           gallery.photos,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getGalleryByToken,
};

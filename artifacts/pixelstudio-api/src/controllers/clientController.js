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
// Match the Prisma schema enums exactly (uppercase).
// Validating here gives the caller a clear error message instead of letting
// Prisma throw an unhandled exception with a cryptic internal message.

const VALID_PHOTO_FORMATS    = ["SOFTCOPY", "HARDCOPY", "BOTH"];
const VALID_PAYMENT_STATUSES = ["PENDING", "PAID"];
const VALID_ORDER_STATUSES   = ["PENDING", "EDITING", "READY", "DELIVERED"];

// ─── Relation shape for list responses ───────────────────────────────────────
// Used in getAllClients — lightweight summary per client.
// Photos are NOT fetched in full — only a count is returned so the list
// does not explode in size when clients have hundreds of uploaded images.

const CLIENT_LIST_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  invoices:  { select: { id: true, invoiceNumber: true, paymentStatus: true, amount: true } },
  _count:    { select: { photos: true, invoices: true, payments: true } },
};

// ─── Relation shape for detail responses ─────────────────────────────────────
// Used in getClientById — returns everything needed for the client detail page.
// Photos come through the gallery so they are displayed in upload order.

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
  invoices: { orderBy: { createdAt: "desc" } },
  payments: { orderBy: { createdAt: "desc" } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Trim a string field from the request body.
 *
 * Returns:
 *   null           — when the value is undefined, null, or blank after trimming
 *   trimmed string — when a non-blank string is provided
 *
 * Always returns null (never undefined) so callers can use a simple
 * `if (!value)` check for both "missing" and "blank" without ambiguity.
 */
const trimField = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Normalise a nullable text field (like `notes`) for storage.
 * An empty string or whitespace-only value becomes null — no blank notes in the DB.
 * An actual string is stored trimmed.
 * Explicitly sending null clears the field.
 *
 * @param {*} value — raw value from req.body
 * @returns {string|null}
 */
const normaliseText = (value) => {
  if (value == null) return null;           // null or undefined → clear the field
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null; // blank string → null
};

// ─── GET /api/clients ─────────────────────────────────────────────────────────
/**
 * Returns a list of clients with summary info (no full photo arrays).
 *
 * Admin  → sees every client in the system, newest first.
 * Staff  → sees only the clients they created (filtered by createdById).
 *
 * Optional query filters (both validated against schema enum values):
 *   ?orderStatus=EDITING      → filter by workflow stage
 *   ?paymentStatus=PENDING    → filter by payment state
 */
const getAllClients = async (req, res, next) => {
  try {
    const where = {};

    // Staff see only their own clients
    if (req.user.role === "staff") {
      where.createdById = req.user.id;
    }

    // Optional query string filters — validated against allow-lists
    if (req.query.orderStatus !== undefined) {
      if (!VALID_ORDER_STATUSES.includes(req.query.orderStatus)) {
        return error(res, `orderStatus must be one of: ${VALID_ORDER_STATUSES.join(", ")}`, 400);
      }
      where.orderStatus = req.query.orderStatus;
    }

    if (req.query.paymentStatus !== undefined) {
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
 * The logged-in user (staff or admin) is automatically set as the creator via JWT.
 *
 * Required body fields: { clientName, phone, price }
 * Optional body fields: { photoFormat, orderStatus, paymentStatus, notes }
 *
 * orderStatus — defaults to PENDING. Can be set on create so clients that are
 *   already in progress (editing, ready, etc.) are recorded correctly from day one.
 *
 * paymentStatus — defaults to PENDING. Can be set to PAID on create for clients
 *   who paid cash before the record was entered into the system.  This path does
 *   NOT create a payment audit record — if a full audit trail is needed, use
 *   POST /api/payments/:clientId after creation instead.
 *
 * A 32-character hex galleryToken is generated here and stored on the client.
 * It is later reused as gallery.token when photos are first uploaded.
 * The share link sent to the customer is built from this token:
 *   e.g. https://pixelstudio.ng/gallery/<galleryToken>
 */
const createClient = async (req, res, next) => {
  try {
    const { price, photoFormat } = req.body;

    // ── Required string fields ────────────────────────────────────────────────
    const clientName = trimField(req.body.clientName);
    const phone      = trimField(req.body.phone);

    if (!clientName) return error(res, "clientName is required and must not be blank", 400);
    if (!phone)      return error(res, "phone is required and must not be blank",      400);

    // ── Price ─────────────────────────────────────────────────────────────────
    // Must be present and a positive number. `price` may arrive as a string from
    // JSON so we parseFloat it before validating.
    const parsedPrice = parseFloat(price);
    if (price == null || isNaN(parsedPrice) || parsedPrice <= 0) {
      return error(res, "price must be a positive number greater than zero", 400);
    }

    // ── photoFormat ───────────────────────────────────────────────────────────
    // Optional — defaults to SOFTCOPY. Must be a valid schema enum value if sent.
    const resolvedFormat = photoFormat || "SOFTCOPY";
    if (!VALID_PHOTO_FORMATS.includes(resolvedFormat)) {
      return error(res, `photoFormat must be one of: ${VALID_PHOTO_FORMATS.join(", ")}`, 400);
    }

    // ── orderStatus ───────────────────────────────────────────────────────────
    // Optional — defaults to PENDING. Validated when provided.
    const resolvedOrderStatus = req.body.orderStatus || "PENDING";
    if (!VALID_ORDER_STATUSES.includes(resolvedOrderStatus)) {
      return error(res, `orderStatus must be one of: ${VALID_ORDER_STATUSES.join(", ")}`, 400);
    }

    // ── paymentStatus ─────────────────────────────────────────────────────────
    // Optional — defaults to PENDING. Validated when provided.
    const resolvedPaymentStatus = req.body.paymentStatus || "PENDING";
    if (!VALID_PAYMENT_STATUSES.includes(resolvedPaymentStatus)) {
      return error(res, `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`, 400);
    }

    // ── Gallery token ─────────────────────────────────────────────────────────
    // 16 random bytes → 32-character hex string. Cryptographically secure —
    // extremely unlikely to collide even with thousands of clients.
    const galleryToken = crypto.randomBytes(16).toString("hex");

    // ── Create record ─────────────────────────────────────────────────────────
    const client = await prisma.client.create({
      data: {
        clientName,
        phone,
        price:         parsedPrice,
        photoFormat:   resolvedFormat,
        orderStatus:   resolvedOrderStatus,
        paymentStatus: resolvedPaymentStatus,
        notes:         normaliseText(req.body.notes), // blank/null → stored as null
        galleryToken,
        createdById:   req.user.id, // always from JWT — body cannot override this
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
 * Sending a field as null explicitly clears it (only valid for nullable fields like notes).
 *
 * Staff can update:  clientName, phone, price, photoFormat, orderStatus, notes
 * Admin can also update: paymentStatus
 *
 * paymentStatus is restricted from staff on UPDATE because ongoing changes are
 * managed by the payments module — POST /api/payments/:clientId records money
 * received and updates the status automatically, maintaining a full audit trail.
 * Note: paymentStatus CAN be set by both staff and admin on initial CREATE (see
 * createClient) because there is no prior audit trail to protect at that point —
 * it covers the case where a client paid cash before the record was entered.
 *
 * Fields that can never be changed: galleryToken, createdById, createdAt.
 */
const updateClient = async (req, res, next) => {
  try {
    const clientId = req.params.id;

    // ── Fetch and ownership check ─────────────────────────────────────────────
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && existing.createdById !== req.user.id) {
      return error(res, "Access denied. You can only update your own clients.", 403);
    }

    // ── Build the update payload ──────────────────────────────────────────────
    const updateData = {};

    // String fields — trim and reject blank/null values (these are required in DB)
    if (req.body.clientName !== undefined) {
      const clientName = trimField(req.body.clientName);
      if (!clientName) return error(res, "clientName is required and must not be blank", 400);
      updateData.clientName = clientName;
    }

    if (req.body.phone !== undefined) {
      const phone = trimField(req.body.phone);
      if (!phone) return error(res, "phone is required and must not be blank", 400);
      updateData.phone = phone;
    }

    // Price — must be a positive number when provided
    if (req.body.price !== undefined) {
      const parsedPrice = parseFloat(req.body.price);
      if (req.body.price == null || isNaN(parsedPrice) || parsedPrice <= 0) {
        return error(res, "price must be a positive number greater than zero", 400);
      }
      updateData.price = parsedPrice;
    }

    // Enum fields — validated against allow-lists before touching the DB
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
    // Staff must go through the payments module so every payment is recorded.
    if (req.body.paymentStatus !== undefined) {
      if (req.user.role === "staff") {
        return error(
          res,
          "Staff cannot set paymentStatus directly. Record a payment via the payments module instead.",
          403
        );
      }
      if (!VALID_PAYMENT_STATUSES.includes(req.body.paymentStatus)) {
        return error(res, `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`, 400);
      }
      updateData.paymentStatus = req.body.paymentStatus;
    }

    // Notes — nullable text field.
    // Sending null or "" explicitly clears the field in the DB.
    // Not sending notes at all leaves it unchanged.
    if (req.body.notes !== undefined) {
      updateData.notes = normaliseText(req.body.notes);
    }

    // ── Guard: nothing to update ──────────────────────────────────────────────
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
 *
 * Cascade chain (all automatic):
 *   Client deleted
 *     → Gallery deleted (Client→Gallery: CASCADE)
 *         → Photos deleted (Gallery→Photos: CASCADE)
 *     → Invoices deleted (Client→Invoices: CASCADE)
 *     → Payments deleted (Client→Payments: CASCADE)
 *
 * Note: Photo.clientId has onDelete: Restrict, but since the Gallery CASCADE
 * deletes all photos first (via Gallery→Photos), MySQL's InnoDB finds no
 * photos remaining when it evaluates the Restrict constraint, so the delete
 * succeeds. This is by design in the schema.
 *
 * Staff can only delete clients they created. Admin can delete any.
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

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};

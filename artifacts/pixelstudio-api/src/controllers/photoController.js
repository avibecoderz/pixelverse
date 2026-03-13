/**
 * photoController.js — Photo Upload & Delete Logic
 *
 * Upload flow (three middleware steps in order):
 *   1. verifyClientOwnership  — validates client exists and belongs to this user,
 *                               attaches req.client so step 3 skips a re-query.
 *                               Runs BEFORE Multer so bad requests are rejected
 *                               before any bytes are written to disk.
 *   2. upload.array("photos") — Multer saves the files, rejects wrong types / size.
 *   3. uploadPhotos           — Creates Gallery if needed, inserts Photo records,
 *                               advances orderStatus, returns the rich response.
 *
 * Cloudinary migration path:
 *   Replace the multer.diskStorage in uploadUtils.js with multer-storage-cloudinary.
 *   In uploadPhotos, set imageUrl = file.path (Cloudinary HTTPS URL) and
 *   publicId = file.filename (Cloudinary public_id). Nothing else changes here.
 */

const fs               = require("fs");
const path             = require("path");
const prisma           = require("../utils/prismaClient");
const { UPLOAD_DIR }   = require("../utils/uploadUtils");
const { success, error } = require("../utils/responseUtils");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Delete a list of Multer file objects from disk.
 * Called in the catch block of uploadPhotos so no orphaned files are left behind
 * if the database insert fails after Multer has already written the files.
 */
const cleanupFiles = (files = []) => {
  files.forEach((file) => {
    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { /* best-effort */ }
    }
  });
};

/**
 * Build the public gallery URL that is sent to the end customer.
 * Uses FRONTEND_URL from .env so the host is never hardcoded.
 */
const galleryUrl = (token) =>
  `${process.env.FRONTEND_URL || "https://pixelstudio.ng"}/gallery/${token}`;

// ─── Middleware 1: verifyClientOwnership ──────────────────────────────────────
/**
 * Validates the client before Multer touches any files.
 *
 * Checks:
 *   - Client exists
 *   - Staff can only upload to clients they created (admin is unrestricted)
 *
 * Attaches req.client so the next handler does not have to re-query.
 *
 * Mounted as: POST /api/clients/:clientId/photos
 * so the param is req.params.clientId.
 */
const verifyClientOwnership = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    req.client = client; // pass to uploadPhotos without a second DB hit
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Handler: uploadPhotos ────────────────────────────────────────────────────
/**
 * Runs after verifyClientOwnership and Multer have both succeeded.
 *
 * Steps:
 *   1. Guard — reject if no files were included
 *   2. Guard — do not allow uploads to an already DELIVERED client
 *   3. Find or create the Gallery for this client
 *   4. Insert one Photo record per uploaded file (transaction → returns IDs)
 *   5. Advance orderStatus to READY (only if not already READY or DELIVERED)
 *   6. Return: client info, gallery token + URL, photo count, photo list
 */
const uploadPhotos = async (req, res, next) => {
  try {
    // ── Guard: files must be present ─────────────────────────────────────────
    if (!req.files || req.files.length === 0) {
      return error(
        res,
        "No files received. Send a multipart/form-data request with a 'photos' field containing at least one image.",
        400
      );
    }

    const { clientId } = req.params;
    const client       = req.client; // attached by verifyClientOwnership

    // ── Guard: do not regress a delivered order ───────────────────────────────
    // Once a client's photos have been delivered we lock the gallery.
    // Staff must contact the admin to reopen it if needed.
    if (client.orderStatus === "DELIVERED") {
      cleanupFiles(req.files);
      return error(
        res,
        "Cannot upload photos. This client's order has already been delivered. Contact admin to reopen it.",
        409
      );
    }

    // ── Find or create the Gallery ────────────────────────────────────────────
    // The gallery token is pre-generated when the client record is created
    // (client.galleryToken) so both rows always share the same token.
    let gallery = await prisma.gallery.findUnique({ where: { clientId } });

    if (!gallery) {
      gallery = await prisma.gallery.create({
        data: {
          token:        client.galleryToken, // mirrors client.galleryToken exactly
          clientId,
          uploadedById: req.user.id,         // the staff member uploading
        },
      });
    }

    // ── Insert Photo records ──────────────────────────────────────────────────
    // We use $transaction with individual create calls (not createMany) because
    // createMany returns only { count: N } — it does not return the created rows.
    // $transaction gives back every created record including auto-generated IDs.
    const photoInserts = req.files.map((file) =>
      prisma.photo.create({
        data: {
          fileName:  file.filename,               // stored name on disk
          imageUrl:  `/uploads/${file.filename}`, // URL served by express.static
          publicId:  null,                        // set to Cloudinary public_id when migrating
          clientId,
          galleryId: gallery.id,
        },
        select: { id: true, imageUrl: true, fileName: true, createdAt: true },
      })
    );

    const photos = await prisma.$transaction(photoInserts);

    // ── Advance order status ──────────────────────────────────────────────────
    // Move to READY only when it makes sense — do not overwrite READY with READY
    // or regress DELIVERED back (already blocked above, but belt-and-suspenders).
    const shouldAdvance = client.orderStatus === "PENDING" || client.orderStatus === "EDITING";
    if (shouldAdvance) {
      await prisma.client.update({
        where: { id: clientId },
        data:  { orderStatus: "READY" },
      });
    }

    // Fetch the updated client so the response reflects the current orderStatus
    const updatedClient = await prisma.client.findUnique({
      where:  { id: clientId },
      select: {
        id:            true,
        clientName:    true,
        phone:         true,
        orderStatus:   true,
        paymentStatus: true,
        galleryToken:  true,
      },
    });

    // ── Build and send response ───────────────────────────────────────────────
    return success(
      res,
      `${photos.length} photo(s) uploaded successfully`,
      {
        client: updatedClient,
        gallery: {
          id:    gallery.id,
          token: gallery.token,
          url:   galleryUrl(gallery.token),
        },
        photoCount: photos.length,
        photos,
      },
      201
    );
  } catch (err) {
    // Clean up any files Multer saved if the DB insert failed
    cleanupFiles(req.files || []);
    next(err);
  }
};

// ─── Handler: deletePhoto ─────────────────────────────────────────────────────
/**
 * Deletes a single photo — removes the file from disk and the DB record.
 * Staff can only delete photos that belong to their own clients.
 *
 * Mounted at: DELETE /api/photos/:id
 */
const deletePhoto = async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({
      where:   { id: req.params.id },
      include: { client: { select: { createdById: true, clientName: true } } },
    });

    if (!photo) return error(res, "Photo not found", 404);

    if (req.user.role === "staff" && photo.client.createdById !== req.user.id) {
      return error(res, "Access denied. This photo belongs to another staff member's client.", 403);
    }

    // Remove the physical file — use UPLOAD_DIR (same absolute path as the uploader used)
    const filePath = path.join(UPLOAD_DIR, photo.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.photo.delete({ where: { id: req.params.id } });
    return success(res, "Photo deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyClientOwnership, uploadPhotos, deletePhoto };

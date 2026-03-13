/**
 * photoController.js — Photo Upload & Delete Logic
 *
 * Photos now belong to both a Client AND a Gallery (required FK in schema).
 * Upload workflow:
 *   1. verifyClientOwnership — validates client exists and belongs to this staff
 *   2. Multer saves files to disk
 *   3. uploadPhotos — finds/creates the Gallery, then inserts Photo records
 *
 * Schema changes reflected here:
 *   filename → fileName
 *   url      → imageUrl
 *   photos now require galleryId (NOT NULL, no default)
 *   staffId  → createdById on Client
 */

const path             = require("path");
const fs               = require("fs");
const prisma           = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── Pre-upload middleware: verifyClientOwnership ─────────────────────────────
// Runs BEFORE Multer saves files to disk. Stops the request early if the
// client doesn't exist or doesn't belong to this staff member — preventing
// orphaned files from being written.
const verifyClientOwnership = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Staff can only upload photos for clients they created (createdById, not staffId)
    if (req.user.role === "staff" && client.createdById !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    // Attach client to the request object so uploadPhotos can use it without
    // making a second database query
    req.client = client;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/photos/upload/:clientId ────────────────────────────────────────
// Runs after verifyClientOwnership and Multer have both finished.
// Creates a Gallery for this client if one doesn't exist yet, then inserts
// Photo records that link to both the Client and the Gallery.
const uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return error(
        res,
        "No files uploaded. Send a multipart/form-data request with a 'photos' field.",
        400
      );
    }

    const { clientId } = req.params;
    const client = req.client; // attached by verifyClientOwnership

    // Find the existing gallery for this client, or create one now.
    // The gallery token reuses client.galleryToken so that both the Gallery
    // and the Client share the same public share token (consistent lookup).
    let gallery = await prisma.gallery.findUnique({ where: { clientId } });

    if (!gallery) {
      gallery = await prisma.gallery.create({
        data: {
          token:        client.galleryToken, // same token as client — single source of truth
          clientId,
          uploadedById: req.user.id,         // staff member doing the upload
        },
      });
    }

    // Build a Photo record for each uploaded file.
    // Both clientId and galleryId are required by the schema.
    const photoData = req.files.map((file) => ({
      fileName:  file.filename,               // filename on disk (e.g. "photo-123.jpg")
      imageUrl:  `/uploads/${file.filename}`, // URL served by express.static
      publicId:  null,                        // no cloud storage in local mode
      clientId,
      galleryId: gallery.id,
    }));

    // Insert all records in a single query (efficient for batch uploads)
    await prisma.photo.createMany({ data: photoData });

    // Auto-advance order status to READY once photos are uploaded
    await prisma.client.update({
      where: { id: clientId },
      data:  { orderStatus: "READY" },
    });

    return success(
      res,
      `${req.files.length} photo(s) uploaded successfully`,
      {
        galleryId: gallery.id,
        uploaded:  photoData.map((p) => p.imageUrl),
      },
      201
    );
  } catch (err) {
    // If the DB insert fails, clean up any files saved to disk so we don't
    // leave orphaned files behind
    if (req.files) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../../uploads", file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    next(err);
  }
};

// ─── DELETE /api/photos/:id ───────────────────────────────────────────────────
// Deletes a photo from disk and from the database.
// Staff can only delete photos from their own clients.
const deletePhoto = async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({
      where:   { id: req.params.id },
      include: { client: { select: { createdById: true } } },
    });

    if (!photo) return error(res, "Photo not found", 404);

    // Ownership check — compare client.createdById (not staffId)
    if (req.user.role === "staff" && photo.client.createdById !== req.user.id) {
      return error(res, "Access denied. This photo belongs to another staff member's client.", 403);
    }

    // Delete the physical file from disk.
    // photo.fileName is the file name (e.g. "photo-1712345678-portrait.jpg")
    const filePath = path.join(__dirname, "../../uploads", photo.fileName);
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

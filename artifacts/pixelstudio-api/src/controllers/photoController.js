/**
 * photoController.js — Photo Upload & Delete Logic
 *
 * Staff upload edited photos for a specific client.
 * Multer (configured in uploadUtils.js) handles disk storage.
 *
 * FIX: We now validate client ownership BEFORE Multer processes the upload.
 * A separate middleware is exported for that pre-upload check.
 */

const path   = require("path");
const fs     = require("fs");
const prisma  = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── Pre-upload ownership check ───────────────────────────────────────────────
// This middleware runs BEFORE Multer saves any files to disk.
// If the client doesn't exist or doesn't belong to this staff member, we stop
// the request immediately — no orphaned files are created.
const verifyClientOwnership = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      return error(res, "Client not found", 404);
    }

    // Staff can only upload photos for their own clients
    if (req.user.role === "staff" && client.staffId !== req.user.id) {
      return error(res, "Access denied. This client belongs to a different staff member.", 403);
    }

    // Attach client to request so we don't need to fetch it again in uploadPhotos
    req.client = client;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/photos/upload/:clientId ────────────────────────────────────────
// Runs after verifyClientOwnership middleware and Multer file saving.
const uploadPhotos = async (req, res, next) => {
  try {
    // req.files is set by Multer. req.client is set by verifyClientOwnership.
    if (!req.files || req.files.length === 0) {
      return error(res, "No files were uploaded. Make sure you are sending a multipart/form-data request with a 'photos' field.", 400);
    }

    const { clientId } = req.params;

    // Build a DB record for each uploaded file
    const photoData = req.files.map((file) => ({
      filename: file.filename,
      url:      `/uploads/${file.filename}`,
      clientId,
    }));

    // Insert all photo records in a single database query
    await prisma.photo.createMany({ data: photoData });

    // Auto-update the order status to READY after photos are uploaded
    await prisma.client.update({
      where: { id: clientId },
      data:  { orderStatus: "READY" },
    });

    return success(
      res,
      `${req.files.length} photo(s) uploaded successfully`,
      { uploaded: photoData.map((p) => p.url) },
      201
    );
  } catch (err) {
    // If the DB insert fails, clean up the files that were saved to disk
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
// FIX: Added ownership check — staff can only delete photos from their own clients.
const deletePhoto = async (req, res, next) => {
  try {
    // Use req.params.id (set by router.delete("/:id", ...))
    const photo = await prisma.photo.findUnique({
      where:   { id: req.params.id },
      include: { client: { select: { staffId: true } } },
    });

    if (!photo) return error(res, "Photo not found", 404);

    // Staff ownership check
    if (req.user.role === "staff" && photo.client.staffId !== req.user.id) {
      return error(res, "Access denied. This photo belongs to another staff member's client.", 403);
    }

    // Delete the physical file from disk
    const filePath = path.join(__dirname, "../../uploads", photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove the database record
    await prisma.photo.delete({ where: { id: req.params.id } });

    return success(res, "Photo deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyClientOwnership, uploadPhotos, deletePhoto };

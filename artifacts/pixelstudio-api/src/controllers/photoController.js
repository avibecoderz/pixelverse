/**
 * photoController.js — Photo Upload Logic
 *
 * Staff upload edited photos for a client.
 * Multer (configured in uploadUtils.js) handles saving files to disk.
 * We save each file's URL to the database and update the client's orderStatus.
 */

const path  = require("path");
const fs    = require("fs");
const prisma = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// POST /api/photos/upload/:clientId
const uploadPhotos = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    // Make sure files were actually uploaded
    if (!req.files || req.files.length === 0) {
      return error(res, "No files were uploaded", 400);
    }

    // Make sure the client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return error(res, "Client not found", 404);

    // Build a record for each uploaded file
    const photoData = req.files.map((file) => ({
      filename: file.filename,
      // The URL the client can use to access the photo
      url:      `/uploads/${file.filename}`,
      clientId,
    }));

    // Save all photo records to the database in one query
    await prisma.photo.createMany({ data: photoData });

    // Automatically update the order status to READY when photos are uploaded
    await prisma.client.update({
      where: { id: clientId },
      data:  { orderStatus: "READY" },
    });

    return success(res, `${req.files.length} photo(s) uploaded successfully`, {
      uploaded: photoData.map((p) => p.url),
    }, 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/photos/:photoId — remove a single photo
const deletePhoto = async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
    if (!photo) return error(res, "Photo not found", 404);

    // Delete the file from disk
    const filePath = path.join(__dirname, "../../uploads", photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Delete the record from the database
    await prisma.photo.delete({ where: { id: req.params.photoId } });

    return success(res, "Photo deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadPhotos, deletePhoto };

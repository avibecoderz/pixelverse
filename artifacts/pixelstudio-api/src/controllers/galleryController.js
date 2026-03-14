/**
 * galleryController.js — Public Gallery Logic
 *
 * This controller handles the customer-facing gallery endpoint.
 * It requires NO authentication — the gallery token is the only credential.
 *
 * Token security model:
 *   The token is a 32-character cryptographically random hex string
 *   (16 bytes from crypto.randomBytes → 32 lowercase hex chars).
 *   It is generated once when the Client record is first created and
 *   stored on both Client.galleryToken and Gallery.token so either table
 *   can be looked up independently.
 *
 * Response behaviour by orderStatus:
 *   PENDING  → 403  — photos not started yet (personalised waiting page data included)
 *   EDITING  → 403  — photos being edited  (personalised waiting page data included)
 *   READY    → 200  — full photo list returned
 *   DELIVERED→ 200  — full photo list returned
 *
 * Both 403 responses include clientName, photographerName, and orderStatus so
 * the frontend can render a personalised "not ready yet" message rather than a
 * blank error screen.
 */

const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── Helper: build the full shareable gallery URL ─────────────────────────────
/**
 * Construct the full frontend URL that customers share.
 * e.g. https://pixelstudio.ng/gallery/abc123def456...
 *
 * Set FRONTEND_URL in .env so this resolves to the real domain in production.
 * Falls back to a placeholder path in development.
 */
const buildGalleryUrl = (token) => {
  const base = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  return base ? `${base}/gallery/${token}` : `/gallery/${token}`;
};

// ─── GET /api/gallery/:token ──────────────────────────────────────────────────
/**
 * Look up a gallery by its public share token and return the photos inside.
 *
 * Shape returned on success (200):
 *   {
 *     studioName, clientName, photographerName,
 *     galleryToken, galleryUrl,
 *     orderStatus, createdAt, photoCount,
 *     photos: [{ id, imageUrl, fileName, createdAt }]
 *   }
 *
 * Shape returned when not ready (403):
 *   {
 *     success: false,
 *     message: "...",
 *     data: { studioName, clientName, photographerName, orderStatus }
 *   }
 */
const getGalleryByToken = async (req, res, next) => {
  try {
    // ── Normalise + validate the token ────────────────────────────────────────
    // Lowercase first: some email clients capitalise URLs in transit.
    const token = req.params.token.toLowerCase();

    // The token is always exactly 32 lowercase hex characters.
    // Reject obviously malformed values before touching the database.
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return error(
        res,
        "Invalid gallery link. Please check the URL and try again.",
        400
      );
    }

    // ── Fetch the gallery ─────────────────────────────────────────────────────
    // Photos are ordered by (createdAt ASC, id ASC) so that multiple files
    // uploaded in one batch (same timestamp) appear in a deterministic order.
    const gallery = await prisma.gallery.findUnique({
      where:  { token },
      select: {
        token:     true,
        createdAt: true,
        client: {
          select: {
            clientName:  true,
            orderStatus: true,
            createdBy:   { select: { name: true } },
          },
        },
        photos: {
          select: {
            id:        true,
            imageUrl:  true,
            fileName:  true,
            createdAt: true,
          },
          orderBy: [
            { createdAt: "asc" },
            { id:        "asc" }, // tie-break for same-batch uploads
          ],
        },
      },
    });

    // ── Token not found ───────────────────────────────────────────────────────
    if (!gallery) {
      return error(
        res,
        "Gallery not found. The link may be invalid or the photos have been removed.",
        404
      );
    }

    // ── Destructure client data ───────────────────────────────────────────────
    const { clientName, orderStatus, createdBy } = gallery.client;

    // createdBy is non-nullable in the schema but we guard against manual DBA deletes
    const photographerName = createdBy ? createdBy.name : "PixelStudio";

    const studioName  = process.env.STUDIO_NAME || "PixelStudio";
    const galleryUrl  = buildGalleryUrl(token);

    // ── Photos not ready yet ──────────────────────────────────────────────────
    // Return a 403 with enough context for a personalised waiting screen.
    // The photo list is intentionally excluded.
    if (orderStatus === "PENDING" || orderStatus === "EDITING") {
      return res.status(403).json({
        success: false,
        message: "Your photos are not ready yet. We will notify you when they are available.",
        data: {
          studioName,
          clientName,
          photographerName,
          orderStatus,
        },
      });
    }

    // ── Photos are ready ──────────────────────────────────────────────────────
    return success(res, "Gallery loaded successfully", {
      studioName,
      clientName,
      photographerName,
      galleryToken: gallery.token,
      galleryUrl,
      orderStatus,
      createdAt:   gallery.createdAt,
      photoCount:  gallery.photos.length,
      photos:      gallery.photos,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGalleryByToken };

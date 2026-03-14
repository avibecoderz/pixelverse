/**
 * galleryController.js — Public Gallery Logic
 *
 * This controller handles the customer-facing gallery endpoint.
 * It requires NO authentication — the gallery token is the only credential.
 *
 * The token is a 32-character cryptographically random hex string generated
 * when the client record is first created. It is unguessable, so sharing the
 * URL only with the intended customer is effectively secure.
 *
 * Response behaviour by orderStatus:
 *   PENDING  → 403 with client name + status (customer sees "not started" message)
 *   EDITING  → 403 with client name + status (customer sees "in progress" message)
 *   READY    → 200 with full photo list
 *   DELIVERED→ 200 with full photo list
 *
 * We include client name and status even on the 403 so the frontend can render
 * a personalised waiting page ("Hi Tunde, your photos are still being edited")
 * rather than a blank error screen.
 */

const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/gallery/:token ──────────────────────────────────────────────────
/**
 * Look up a gallery by its public share token and return the photos inside.
 *
 * Prisma query shape:
 *   Gallery
 *     ├── client
 *     │     ├── clientName
 *     │     ├── orderStatus
 *     │     └── createdBy  { name }   ← photographer name
 *     └── photos  (ordered oldest → newest)
 *           ├── id
 *           ├── imageUrl
 *           ├── fileName
 *           └── createdAt
 */
const getGalleryByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Validate token format — must be a 32-char hex string.
    // This blocks obviously malformed tokens before hitting the DB.
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return error(res, "Invalid gallery link. Please check the URL and try again.", 400);
    }

    const gallery = await prisma.gallery.findUnique({
      where: { token },
      include: {
        client: {
          select: {
            clientName:  true,
            orderStatus: true,
            createdBy:   { select: { name: true } }, // photographer / studio staff name
          },
        },
        photos: {
          select: {
            id:        true,
            imageUrl:  true,
            fileName:  true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" }, // oldest photo first (upload order)
        },
      },
    });

    // Token not found — either invalid or the client was deleted
    if (!gallery) {
      return error(
        res,
        "Gallery not found. The link may be invalid or expired.",
        404
      );
    }

    const { clientName, orderStatus, createdBy } = gallery.client;

    // Studio name — optional, pulled from environment so it is configurable
    // without changing code. Falls back to "PixelStudio" if not set.
    const studioName = process.env.STUDIO_NAME || "PixelStudio";

    // ── Not ready yet ─────────────────────────────────────────────────────────
    // Return 403 but still include the client name, studio name, and orderStatus
    // so the frontend can render a personalised waiting page instead of a
    // generic error screen. The photo list is intentionally omitted.
    if (orderStatus === "PENDING" || orderStatus === "EDITING") {
      return res.status(403).json({
        success:    false,
        message:    "Your photos are not ready yet. We will notify you when they are available.",
        data: {
          studioName,
          clientName,
          orderStatus,
          photographerName: createdBy.name,
        },
      });
    }

    // ── Photos are ready ──────────────────────────────────────────────────────
    return success(res, "Gallery loaded", {
      studioName,
      clientName,
      photographerName: createdBy.name,
      galleryToken:     gallery.token,
      orderStatus,
      createdAt:        gallery.createdAt,  // when gallery was first created
      photoCount:       gallery.photos.length,
      photos:           gallery.photos,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGalleryByToken };

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
 *   PENDING  → 403 with clientName + studioName + orderStatus
 *               (customer sees "not started yet" message)
 *   EDITING  → 403 with clientName + studioName + orderStatus
 *               (customer sees "still being edited" message)
 *   READY    → 200 with full photo list
 *   DELIVERED→ 200 with full photo list
 *
 * We intentionally include clientName + studioName on the 403 so the
 * frontend can render a personalised waiting page:
 *   "Hi Tunde, your PixelStudio photos are still being edited."
 * instead of a blank error screen.
 */

const prisma             = require("../utils/prismaClient");
const { success, error } = require("../utils/responseUtils");

// ─── GET /api/gallery/:token ──────────────────────────────────────────────────
/**
 * Look up a gallery by its public share token and return the photos inside.
 *
 * Prisma query uses top-level `select` (not `include`) so only the exact
 * columns needed are fetched — FK columns (clientId, uploadedById) and
 * updatedAt are never sent to the client.
 *
 * Shape returned by Prisma:
 *   {
 *     token:     string,
 *     createdAt: Date,
 *     client: {
 *       clientName:  string,
 *       orderStatus: "PENDING" | "EDITING" | "READY" | "DELIVERED",
 *       createdBy:   { name: string } | null   ← null only if DBA deleted the user row
 *     },
 *     photos: Array<{ id, imageUrl, fileName, createdAt }>
 *   }
 */
const getGalleryByToken = async (req, res, next) => {
  try {
    // ── Normalise + validate the token ────────────────────────────────────────
    // Lowercase first: some email clients capitalise URLs in transit, which
    // would cause a genuine token to fail validation unnecessarily.
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
    // Use `select` at the top level so Prisma only fetches the columns we
    // actually use in the response — FK columns are not included.
    //
    // Photos are ordered by (createdAt ASC, id ASC).
    // The secondary `id` sort is essential because multiple files uploaded in
    // a single request are inserted inside one $transaction, so they all share
    // the same createdAt timestamp. Without the secondary key the order would
    // be non-deterministic across repeated fetches.
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
            { createdAt: "asc" }, // oldest batch first
            { id:        "asc" }, // tie-break: deterministic order within same batch
          ],
        },
      },
    });

    // ── Token not found ───────────────────────────────────────────────────────
    if (!gallery) {
      return error(
        res,
        "Gallery not found. The link may be invalid or expired.",
        404
      );
    }

    // ── Destructure safely ────────────────────────────────────────────────────
    const { clientName, orderStatus, createdBy } = gallery.client;

    // createdBy is non-nullable in the schema (Client.createdById: String, no ?),
    // but we guard anyway in case a DBA deleted a user row directly.
    const photographerName = createdBy ? createdBy.name : "PixelStudio";

    // Studio name — read from .env so the studio owner configures it once
    // without touching code. Falls back to "PixelStudio" if not set.
    const studioName = process.env.STUDIO_NAME || "PixelStudio";

    // ── Not ready yet ─────────────────────────────────────────────────────────
    // Respond with 403 but include enough context for the frontend to render a
    // personalised waiting screen. The photo list is intentionally omitted.
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
    return success(res, "Gallery loaded", {
      studioName,
      clientName,
      photographerName,
      galleryToken: gallery.token,
      orderStatus,
      createdAt:    gallery.createdAt, // when photos were first uploaded
      photoCount:   gallery.photos.length,
      photos:       gallery.photos,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGalleryByToken };

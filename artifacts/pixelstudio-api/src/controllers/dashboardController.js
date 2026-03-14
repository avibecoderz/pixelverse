/**
 * dashboardController.js — Dashboard Summary Endpoints
 *
 * Provides high-level statistics and recent-activity snapshots for the
 * PixelStudio frontend dashboards.
 *
 * Two dashboards:
 *
 *   Admin  (GET /api/dashboard/admin)
 *     System-wide stats: all staff, clients, revenue, galleries, pending
 *     payments, recent clients, and recent payments across every staff member.
 *
 *   Staff  (GET /api/dashboard/staff)
 *     Personal stats: clients this staff created, editing pipeline counts,
 *     galleries they uploaded, revenue they recorded, their recent clients,
 *     and their recent payments.
 *
 * Performance:
 *   All independent Prisma queries inside each handler run in parallel via
 *   Promise.all so the response is as fast as the slowest single query —
 *   not the sum of all queries.
 *
 * ─── Order status workflow ───────────────────────────────────────────────────
 *   PENDING   → booked, editing has not started            (pendingEditingCount)
 *   EDITING   → photos on the editing desk, not uploaded   (readyForUploadCount)
 *   READY     → photos uploaded to gallery, client waiting
 *   DELIVERED → gallery link sent, session complete
 * ─────────────────────────────────────────────────────────────────────────────
 */

const prisma          = require("../utils/prismaClient");
const { success }     = require("../utils/responseUtils");

// ─── Shared select shape for a client in a recent-activity list ───────────────
// Lightweight — just enough for the frontend to render a row.
const RECENT_CLIENT_SELECT = {
  id:            true,
  clientName:    true,
  phone:         true,
  orderStatus:   true,
  paymentStatus: true,
  createdAt:     true,
  createdBy: {
    select: { id: true, name: true },
  },
};

// ─── Shared select shape for a payment in a recent-activity list ──────────────
const RECENT_PAYMENT_SELECT = {
  id:        true,
  amount:    true,
  status:    true,
  createdAt: true,
  client: {
    select: { id: true, clientName: true },
  },
  receivedBy: {
    select: { id: true, name: true },
  },
};

// ─── GET /api/dashboard/admin ─────────────────────────────────────────────────
/**
 * System-wide dashboard for admin users.
 *
 * Returns:
 *   stats.totalStaff           — active staff accounts in the system
 *   stats.totalClients         — all clients across all staff
 *   stats.totalRevenue         — sum of all PAID payments (₦)
 *   stats.pendingPaymentsCount — clients whose paymentStatus is still PENDING
 *   stats.totalGalleries       — uploaded photo galleries in the system
 *   recentClients              — 5 most recently created clients (any staff)
 *   recentPayments             — 5 most recently recorded payments (any staff)
 *
 * "Recent staff activity" is surfaced through recentClients (each client shows
 * which staff member created it and when) and recentPayments (each payment
 * shows who recorded it). This covers activity without an extra query.
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    // Run all independent queries concurrently — no query depends on another
    const [
      totalStaff,
      totalClients,
      revenueAggregate,
      pendingPaymentsCount,
      totalGalleries,
      recentClients,
      recentPayments,
    ] = await Promise.all([

      // Count active staff accounts only — deactivated accounts are excluded
      prisma.user.count({
        where: { role: "STAFF", isActive: true },
      }),

      // All clients regardless of status
      prisma.client.count(),

      // Sum of all confirmed payments across the entire studio
      prisma.payment.aggregate({
        where: { status: "PAID" },
        _sum:  { amount: true },
      }),

      // Clients who have not yet settled their full session price
      prisma.client.count({
        where: { paymentStatus: "PENDING" },
      }),

      // All uploaded photo galleries
      prisma.gallery.count(),

      // 5 most recently created clients with the staff member who created them
      prisma.client.findMany({
        take:    5,
        orderBy: { createdAt: "desc" },
        select:  RECENT_CLIENT_SELECT,
      }),

      // 5 most recently recorded payments with client and recorder details
      prisma.payment.findMany({
        take:    5,
        orderBy: { createdAt: "desc" },
        select:  RECENT_PAYMENT_SELECT,
      }),
    ]);

    const totalRevenue = parseFloat(revenueAggregate._sum.amount || 0);

    return success(res, "Admin dashboard fetched", {
      stats: {
        totalStaff,
        totalClients,
        totalRevenue,
        pendingPaymentsCount,
        totalGalleries,
      },
      recentClients,
      recentPayments,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/staff ─────────────────────────────────────────────────
/**
 * Personal dashboard for the currently logged-in staff member.
 *
 * All stats and activity are scoped to req.user.id — a staff member only
 * ever sees their own numbers here.
 *
 * Returns:
 *   stats.totalClients          — clients this staff member has created
 *   stats.pendingEditingCount   — clients with orderStatus PENDING
 *                                 (booked but editing has not started yet)
 *   stats.readyForUploadCount   — clients with orderStatus EDITING
 *                                 (editing done on the desk, not yet uploaded)
 *   stats.uploadedGalleriesCount— galleries this staff member has uploaded
 *   stats.totalRevenue          — sum of PAID payments recorded by this staff (₦)
 *   recentClients               — 5 most recent clients this staff created
 *   recentPayments              — 5 most recent payments this staff recorded
 */
const getStaffDashboard = async (req, res, next) => {
  try {
    const staffId = req.user.id;

    // Run all independent queries concurrently
    const [
      totalClients,
      pendingEditingCount,
      readyForUploadCount,
      uploadedGalleriesCount,
      revenueAggregate,
      recentClients,
      recentPayments,
    ] = await Promise.all([

      // Every client this staff member has ever created
      prisma.client.count({
        where: { createdById: staffId },
      }),

      // Clients booked but editing has not started — "pending editing"
      prisma.client.count({
        where: { createdById: staffId, orderStatus: "PENDING" },
      }),

      // Clients in the editing stage — editing done, photos ready to upload
      prisma.client.count({
        where: { createdById: staffId, orderStatus: "EDITING" },
      }),

      // Galleries this staff member has uploaded to the system
      prisma.gallery.count({
        where: { uploadedById: staffId },
      }),

      // Total confirmed payment money received by this staff member
      prisma.payment.aggregate({
        where: { receivedById: staffId, status: "PAID" },
        _sum:  { amount: true },
      }),

      // 5 most recently created clients for this staff member
      prisma.client.findMany({
        where:   { createdById: staffId },
        take:    5,
        orderBy: { createdAt: "desc" },
        select: {
          id:            true,
          clientName:    true,
          phone:         true,
          orderStatus:   true,
          paymentStatus: true,
          createdAt:     true,
        },
      }),

      // 5 most recently recorded payments by this staff member
      prisma.payment.findMany({
        where:   { receivedById: staffId },
        take:    5,
        orderBy: { createdAt: "desc" },
        select: {
          id:        true,
          amount:    true,
          status:    true,
          createdAt: true,
          client: {
            select: { id: true, clientName: true },
          },
        },
      }),
    ]);

    const totalRevenue = parseFloat(revenueAggregate._sum.amount || 0);

    return success(res, "Staff dashboard fetched", {
      stats: {
        totalClients,
        pendingEditingCount,
        readyForUploadCount,
        uploadedGalleriesCount,
        totalRevenue,
      },
      recentClients,
      recentPayments,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminDashboard, getStaffDashboard };

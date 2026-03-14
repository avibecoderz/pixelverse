/**
 * invoiceUtils.js — Invoice Number Generator
 *
 * Generates human-readable sequential invoice numbers in the format INV-0001.
 *
 * Why not use count() + 1?
 *   count() returns the CURRENT number of rows. If any invoice has ever been
 *   deleted, count() falls below the highest number ever issued. The next
 *   generated number would collide with an existing one and Prisma would
 *   throw a P2002 unique constraint error on the database insert.
 *
 *   Example: INV-0001 to INV-0005 created, INV-0003 deleted.
 *   count() = 4 → next = "INV-0005" → collision with existing INV-0005 → crash.
 *
 * Correct approach:
 *   Fetch all existing invoice numbers, parse the numeric suffix from each,
 *   find the maximum, and increment. This is O(n) on invoice count but a
 *   photography studio will realistically never exceed a few thousand invoices.
 *   At that scale the query takes < 5ms.
 *
 * Race condition note:
 *   Two simultaneous invoice creations could both read the same max and
 *   generate the same number. The @unique constraint on Invoice.invoiceNumber
 *   ensures only one succeeds — the other gets a P2002, which the global
 *   error middleware maps to a 409. For the scale of a studio management
 *   system this is acceptable. A counter table with SELECT ... FOR UPDATE
 *   would eliminate the race at the cost of added complexity.
 *
 * Number format:
 *   INV-0001 through INV-9999 (4-digit padding).
 *   After INV-9999 the padding grows automatically: INV-10000, INV-10001 …
 *   The regex parser handles any number of digits so this never breaks.
 *
 * Usage:
 *   const { generateInvoiceNumber } = require("../utils/invoiceUtils");
 *   const invoiceNumber = await generateInvoiceNumber(prisma);
 */

/**
 * Generate the next invoice number.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @returns {Promise<string>}  e.g. "INV-0001"
 */
const generateInvoiceNumber = async (prisma) => {
  // Fetch only the invoiceNumber column — no other data needed
  const existing = await prisma.invoice.findMany({
    select: { invoiceNumber: true },
  });

  if (existing.length === 0) return "INV-0001";

  // Parse the numeric suffix from each invoice number.
  // The regex anchors to exactly "INV-" followed by one or more digits.
  // Any malformed entries (e.g. manually inserted test data) are treated as 0.
  const numbers = existing.map((inv) => {
    const match = inv.invoiceNumber.match(/^INV-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });

  const max = Math.max(...numbers);
  return `INV-${String(max + 1).padStart(4, "0")}`;
};

module.exports = { generateInvoiceNumber };

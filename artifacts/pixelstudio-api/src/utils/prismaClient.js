/**
 * prismaClient.js — Singleton Prisma Client
 *
 * We create ONE Prisma client instance and reuse it everywhere.
 * This avoids creating too many database connections.
 *
 * Import this file in any controller:
 *   const prisma = require("../utils/prismaClient");
 */

const { PrismaClient } = require("@prisma/client");

// In development, log the SQL queries Prisma generates
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

module.exports = prisma;

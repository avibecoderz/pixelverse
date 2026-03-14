/**
 * seed.js — Database Seeder
 *
 * Creates the first admin user in the database.
 * Safe to run multiple times — it checks whether the admin already exists
 * before attempting to create one, so it will never create a duplicate.
 *
 * Run with:
 *   npm run db:seed
 *
 * (which calls: node src/utils/seed.js)
 *
 * Requirements:
 *   - Your DATABASE_URL must be set in your .env file
 *   - The database must already be migrated (npm run db:migrate)
 */

"use strict";

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt           = require("bcryptjs");

const prisma = new PrismaClient();

// ─── Admin seed data ──────────────────────────────────────────────────────────

const ADMIN = {
  name:     "Admin User",
  email:    "admin@pixelstudio.com",
  password: "admin123",
  phone:    "08000000000",   // placeholder — update via the app after first login
  role:     "ADMIN",
};

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  console.log("PixelStudio — Database Seeder");
  console.log("─".repeat(40));

  // Check whether the admin account already exists.
  // findUnique on @unique email field is an exact, fast lookup.
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN.email },
  });

  if (existing) {
    console.log(`Admin already exists (id: ${existing.id})`);
    console.log(`Email : ${existing.email}`);
    console.log(`Role  : ${existing.role}`);
    console.log("\nNothing was changed. Exiting.");
    return;
  }

  // Hash the password with bcrypt before storing it.
  // Salt rounds: 10 is the standard balance between security and speed.
  const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

  // Create the admin user
  const admin = await prisma.user.create({
    data: {
      name:     ADMIN.name,
      email:    ADMIN.email,
      phone:    ADMIN.phone,
      password: hashedPassword,
      role:     ADMIN.role,
      isActive: true,
    },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
    },
  });

  console.log("Admin account created successfully.");
  console.log("");
  console.log(`  ID        : ${admin.id}`);
  console.log(`  Name      : ${admin.name}`);
  console.log(`  Email     : ${admin.email}`);
  console.log(`  Role      : ${admin.role}`);
  console.log(`  Active    : ${admin.isActive}`);
  console.log(`  Created   : ${admin.createdAt.toISOString()}`);
  console.log("");
  console.log("Login credentials:");
  console.log(`  Email     : ${ADMIN.email}`);
  console.log(`  Password  : ${ADMIN.password}`);
  console.log(`  Role      : admin`);
  console.log("");
  console.log("Change the password after your first login.");
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seed()
  .catch((err) => {
    console.error("Seeder failed:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

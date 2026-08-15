import { PrismaClient } from "@prisma/client";

// Standard singleton so Next.js dev-mode hot reload doesn't spawn a new
// PrismaClient (and a new SQLite connection pool) on every file edit.
// Swapping the database later (e.g. to Postgres) only requires changing
// prisma/schema.prisma + DATABASE_URL — this file, and every caller of it,
// stays the same.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 is Rust-free and requires an explicit driver adapter.
// We use the node-postgres adapter, which works with Neon's Postgres endpoint.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

// Reuse the client across hot reloads in development to avoid exhausting connections.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

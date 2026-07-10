import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Quick database connectivity + sanity check.
// Run with: npx tsx scripts/test-db.ts
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to .env before running.");
  }

  console.log("Testing database connection...");

  // 1. Raw connectivity check.
  await prisma.$queryRaw`SELECT 1`;
  console.log("✅ Connected");

  // 2. Row counts per table.
  const [users, items, collections, itemTypes, tags] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.collection.count(),
    prisma.itemType.count(),
    prisma.tag.count(),
  ]);

  console.log("\nRow counts:");
  console.log(`  users:        ${users}`);
  console.log(`  items:        ${items}`);
  console.log(`  collections:  ${collections}`);
  console.log(`  itemTypes:    ${itemTypes}`);
  console.log(`  tags:         ${tags}`);

  // 3. Confirm the system item types were seeded.
  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
    select: { name: true, icon: true, color: true },
  });

  console.log(`\nSystem item types (${systemTypes.length}):`);
  for (const type of systemTypes) {
    console.log(`  - ${type.name} (${type.icon}, ${type.color})`);
  }

  console.log("\n✅ Database test complete.");
}

main()
  .catch((e) => {
    console.error("❌ Database test failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

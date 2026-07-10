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

  // 4. Fetch the seeded demo user with their collections and items.
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@devstash.io" },
    include: {
      collections: {
        orderBy: { name: "asc" },
        include: {
          items: {
            orderBy: { item: { title: "asc" } },
            include: { item: { include: { itemType: true } } },
          },
        },
      },
    },
  });

  if (!demoUser) {
    throw new Error(
      "Demo user (demo@devstash.io) not found. Run `npx prisma db seed` first.",
    );
  }

  console.log("\nDemo user:");
  console.log(`  ${demoUser.name} <${demoUser.email}>`);
  console.log(`  isPro: ${demoUser.isPro}, emailVerified: ${demoUser.emailVerified?.toISOString() ?? "null"}`);
  console.log(`  collections: ${demoUser.collections.length}`);

  for (const collection of demoUser.collections) {
    console.log(`\n  📁 ${collection.name} — ${collection.description ?? ""}`);
    for (const { item } of collection.items) {
      const detail = item.url ?? item.language ?? item.itemType.name;
      console.log(`     - [${item.itemType.name}] ${item.title} (${detail})`);
    }
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

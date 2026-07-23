import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Removes every user except the seeded demo account, along with everything they
// own — items, collections, custom item types, OAuth accounts and sessions.
// Useful for clearing out throwaway accounts left behind by manual testing.
//
// Runs against whatever DATABASE_URL points at, so check your .env first.
//
//   npm run db:purge          # dry run — lists what would be deleted
//   npm run db:purge -- --yes # actually delete
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const KEEP_EMAIL = "demo@devstash.io";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to .env before running.");
  }

  // Guards against pointing this at an unseeded or unexpected database.
  const demoUser = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: { id: true },
  });
  if (!demoUser) {
    throw new Error(
      `Demo user (${KEEP_EMAIL}) not found — refusing to run in case this is the wrong database.`
    );
  }

  const doomed = await prisma.user.findMany({
    where: { email: { not: KEEP_EMAIL } },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (doomed.length === 0) {
    console.log(`Nothing to do — ${KEEP_EMAIL} is the only user.`);
    return;
  }

  const userIds = doomed.map((user) => user.id);
  const [items, collections, itemTypes] = await Promise.all([
    prisma.item.count({ where: { userId: { in: userIds } } }),
    prisma.collection.count({ where: { userId: { in: userIds } } }),
    prisma.itemType.count({ where: { userId: { in: userIds } } }),
  ]);

  console.log(`Users to delete (${doomed.length}):`);
  for (const user of doomed) {
    console.log(`  - ${user.email}`);
  }
  console.log(
    `\nTheir content: ${items} items, ${collections} collections, ${itemTypes} custom item types.`
  );

  if (!process.argv.includes("--yes")) {
    console.log("\nDry run — nothing deleted. Re-run with --yes to confirm.");
    return;
  }

  await purge(userIds);
  console.log("\n✅ Purge complete.");
}

async function purge(userIds: string[]) {
  console.log("\nDeleting...");

  // Items and collections would cascade from the user anyway, but custom item
  // types are referenced by items without a cascade — so clear the referencing
  // rows first rather than relying on cascade ordering.
  const items = await prisma.item.deleteMany({
    where: { userId: { in: userIds } },
  });
  const collections = await prisma.collection.deleteMany({
    where: { userId: { in: userIds } },
  });
  const itemTypes = await prisma.itemType.deleteMany({
    where: { userId: { in: userIds } },
  });
  const users = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  // Verification tokens key off the email address, not a foreign key, so they
  // survive the user delete and have to be swept separately.
  const remaining = await prisma.user.findMany({ select: { email: true } });
  const tokens = await prisma.verificationToken.deleteMany({
    where: { identifier: { notIn: remaining.map((user) => user.email) } },
  });

  // Tags are shared rather than user-owned; drop any left with no items.
  const tags = await prisma.tag.deleteMany({ where: { items: { none: {} } } });

  console.log(`  items:              ${items.count}`);
  console.log(`  collections:        ${collections.count}`);
  console.log(`  custom item types:  ${itemTypes.count}`);
  console.log(`  users:              ${users.count}`);
  console.log(`  verification tokens:${tokens.count}`);
  console.log(`  orphaned tags:      ${tags.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Purge failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

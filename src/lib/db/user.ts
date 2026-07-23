// Data-fetching helper for the profile page. Unlike the dashboard helpers
// (still scoped to the seeded demo user), the profile is inherently about the
// signed-in user, so this reads by the session user's id.

import { prisma } from "@/lib/prisma";
import { SYSTEM_TYPE_ORDER } from "@/lib/item-types";
import { type ItemTypeSummary } from "@/lib/db/items";

export interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  // True when the account has a password set (email/password sign-up). Drives
  // whether the change-password action is offered; never exposes the hash.
  hasPassword: boolean;
  stats: {
    items: number;
    collections: number;
  };
  // Per-type item counts in canonical order, zero-filled.
  typeBreakdown: ItemTypeSummary[];
}

// Loads the signed-in user's profile: identity, usage stats, and a per-type
// item breakdown. Returns null if the user id no longer maps to a record.
export async function getUserProfile(
  userId: string
): Promise<ProfileData | null> {
  const [user, itemCount, collectionCount, systemTypes, grouped] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          password: true,
        },
      }),
      prisma.item.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
      prisma.itemType.findMany({
        where: { isSystem: true },
        select: { id: true, name: true },
      }),
      prisma.item.groupBy({
        by: ["itemTypeId"],
        where: { userId },
        _count: { _all: true },
      }),
    ]);

  if (!user) {
    return null;
  }

  const countByTypeId = new Map(grouped.map((g) => [g.itemTypeId, g._count._all]));
  const countByName = new Map<string, number>();
  for (const type of systemTypes) {
    countByName.set(type.name, countByTypeId.get(type.id) ?? 0);
  }

  const typeBreakdown: ItemTypeSummary[] = SYSTEM_TYPE_ORDER.map((name) => ({
    name,
    count: countByName.get(name) ?? 0,
  }));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.password),
    stats: { items: itemCount, collections: collectionCount },
    typeBreakdown,
  };
}

// Data-fetching helpers for the dashboard's item sections (Pinned + Recent).
// Every helper takes the session user's id as a required parameter — never a
// default or a fallback, so a missed call site fails the build rather than
// silently serving another account's rows.

import { prisma } from "@/lib/prisma";
import { SYSTEM_TYPE_ORDER } from "@/lib/item-types";

export interface ItemCardData {
  id: string;
  title: string;
  description: string | null;
  // System item-type name (e.g. "snippet"), used for icon/accent styling.
  typeName: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: Date;
}

// Shared query shape: only the fields an item row renders.
const itemSelect = {
  id: true,
  title: true,
  description: true,
  isFavorite: true,
  isPinned: true,
  updatedAt: true,
  itemType: { select: { name: true } },
  tags: { select: { name: true } },
} as const;

type ItemRow = {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: Date;
  itemType: { name: string };
  tags: { name: string }[];
};

function toCardData(item: ItemRow): ItemCardData {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    typeName: item.itemType.name,
    tags: item.tags.map((tag) => tag.name),
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    updatedAt: item.updatedAt,
  };
}

export async function getPinnedItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });

  return items.map(toCardData);
}

export async function getRecentItems(
  userId: string,
  limit = 10
): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: itemSelect,
  });

  return items.map(toCardData);
}

export interface ItemTypeSummary {
  // System item-type name (e.g. "snippet"), used for icon/label styling.
  name: string;
  // Number of the user's items of this type.
  count: number;
}

// Returns all seven system item types in canonical order with the user's item
// count per type (zero-filled), for the sidebar Types group.
export async function getSidebarItemTypes(
  userId: string
): Promise<ItemTypeSummary[]> {
  const [systemTypes, grouped] = await Promise.all([
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

  const countByTypeId = new Map(grouped.map((g) => [g.itemTypeId, g._count._all]));
  const countByName = new Map<string, number>();
  for (const type of systemTypes) {
    countByName.set(type.name, countByTypeId.get(type.id) ?? 0);
  }

  return SYSTEM_TYPE_ORDER.map((name) => ({
    name,
    count: countByName.get(name) ?? 0,
  }));
}

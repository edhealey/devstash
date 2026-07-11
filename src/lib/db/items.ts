// Data-fetching helpers for the dashboard's item sections (Pinned + Recent).
// Auth is not wired up yet, so we scope queries to the seeded demo user.

import { prisma } from "@/lib/prisma";

// The demo account created in prisma/seed.ts. Replace with the session user
// once NextAuth is in place.
const DEMO_USER_EMAIL = "demo@devstash.io";

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

export async function getPinnedItems(): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { user: { email: DEMO_USER_EMAIL }, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });

  return items.map(toCardData);
}

export async function getRecentItems(limit = 10): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { user: { email: DEMO_USER_EMAIL } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: itemSelect,
  });

  return items.map(toCardData);
}

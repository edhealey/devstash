// Data-fetching helpers for the dashboard's item sections (Pinned + Recent).
// Every helper takes the session user's id as a required parameter — never a
// default or a fallback, so a missed call site fails the build rather than
// silently serving another account's rows.

import { type ContentType } from "@/generated/prisma/enums";
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

// All of the user's items of one system type (e.g. "snippet"), newest-first,
// for the /items/[type] list page. The type is matched by name against the
// system rows (userId: null) so a user's custom type of the same name can't
// leak into a system-type listing.
export async function getItemsByType(
  userId: string,
  typeName: string
): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, itemType: { name: typeName, isSystem: true } },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });

  return items.map(toCardData);
}

// Everything the item drawer renders: the card fields plus the ones only the
// detail view needs (content, language, collection membership, created date).
export interface ItemDetail extends ItemCardData {
  contentType: ContentType;
  content: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  language: string | null;
  collections: { id: string; name: string }[];
  createdAt: Date;
}

// Wire shape of ItemDetail as it arrives from GET /api/items/[id]: JSON has no
// Date, so the timestamps come back as ISO strings.
export type ItemDetailPayload = Omit<
  ItemDetail,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

const itemDetailSelect = {
  ...itemSelect,
  contentType: true,
  content: true,
  url: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  language: true,
  createdAt: true,
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { addedAt: "asc" },
  },
} as const;

// Full detail for one item, fetched when the drawer opens. The `userId` is part
// of the lookup rather than a check on the result, so another account's item is
// indistinguishable from one that doesn't exist.
export async function getItemDetail(
  userId: string,
  itemId: string
): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: itemDetailSelect,
  });

  if (!item) return null;

  return {
    ...toCardData(item),
    contentType: item.contentType,
    content: item.content,
    url: item.url,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    language: item.language,
    collections: item.collections.map((entry) => entry.collection),
    createdAt: item.createdAt,
  };
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

// Data-fetching helpers for the dashboard's Collections section.
// Auth is not wired up yet, so we scope queries to the seeded demo user.

import { prisma } from "@/lib/prisma";
import { systemTypeOrderIndex } from "@/lib/item-types";

// The demo account created in prisma/seed.ts. Replace with the session user
// once NextAuth is in place.
const DEMO_USER_EMAIL = "demo@devstash.io";

export interface CollectionCardData {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  // Distinct item-type names present, ordered by canonical system order.
  typeNames: string[];
  // Most-used item-type name, used for the card's accent border. Null if empty.
  dominantType: string | null;
}

export interface DashboardStats {
  items: number;
  collections: number;
  favoriteItems: number;
  favoriteCollections: number;
}

// Orders distinct type names by canonical system order for stable rendering,
// and picks the most frequent as the dominant (accent) type.
function summarizeTypes(typeNames: string[]): {
  distinct: string[];
  dominant: string | null;
} {
  const counts = new Map<string, number>();
  for (const name of typeNames) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const distinct = [...counts.keys()].sort(
    (a, b) => systemTypeOrderIndex(a) - systemTypeOrderIndex(b)
  );

  let dominant: string | null = null;
  let max = 0;
  for (const [name, count] of counts) {
    if (count > max) {
      max = count;
      dominant = name;
    }
  }

  return { distinct, dominant };
}

export async function getRecentCollections(
  limit = 6
): Promise<CollectionCardData[]> {
  const collections = await prisma.collection.findMany({
    where: { user: { email: DEMO_USER_EMAIL } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      items: {
        include: {
          item: { select: { itemType: { select: { name: true } } } },
        },
      },
    },
  });

  return collections.map((collection) => {
    const typeNames = collection.items.map((ic) => ic.item.itemType.name);
    const { distinct, dominant } = summarizeTypes(typeNames);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      typeNames: distinct,
      dominantType: dominant,
    };
  });
}

export interface SidebarCollectionData {
  id: string;
  name: string;
  isFavorite: boolean;
  itemCount: number;
  // Most-used item-type name, used for the recent collection's colored dot.
  dominantType: string | null;
}

// Collections for the sidebar, split into Favorites and Recent. Recent is
// ordered newest-first; the dominant type drives each row's colored dot.
export async function getSidebarCollections(): Promise<{
  favorites: SidebarCollectionData[];
  recent: SidebarCollectionData[];
}> {
  const collections = await prisma.collection.findMany({
    where: { user: { email: DEMO_USER_EMAIL } },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          item: { select: { itemType: { select: { name: true } } } },
        },
      },
    },
  });

  const mapped: SidebarCollectionData[] = collections.map((collection) => {
    const typeNames = collection.items.map((ic) => ic.item.itemType.name);
    const { dominant } = summarizeTypes(typeNames);

    return {
      id: collection.id,
      name: collection.name,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      dominantType: dominant,
    };
  });

  return {
    favorites: mapped.filter((c) => c.isFavorite),
    recent: mapped.filter((c) => !c.isFavorite),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const where = { user: { email: DEMO_USER_EMAIL } };

  const [items, collections, favoriteItems, favoriteCollections] =
    await Promise.all([
      prisma.item.count({ where }),
      prisma.collection.count({ where }),
      prisma.item.count({ where: { ...where, isFavorite: true } }),
      prisma.collection.count({ where: { ...where, isFavorite: true } }),
    ]);

  return { items, collections, favoriteItems, favoriteCollections };
}

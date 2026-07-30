import { beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` factories are hoisted above the imports, so the mock object has to
// come from `vi.hoisted`.
const { prisma } = vi.hoisted(() => ({
  prisma: {
    item: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { getItemDetail, getItemsByType } from "@/lib/db/items";

const ROW = {
  id: "item_1",
  title: "useAuth hook",
  description: "Custom authentication hook",
  isFavorite: true,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
  contentType: "TEXT",
  content: "export function useAuth() {}",
  url: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  language: "typescript",
  itemType: { name: "snippet" },
  tags: [{ name: "react" }, { name: "auth" }],
  collections: [{ collection: { id: "col_1", name: "React Patterns" } }],
};

beforeEach(() => {
  prisma.item.findFirst.mockResolvedValue(ROW);
  prisma.item.findMany.mockResolvedValue([]);
});

describe("getItemDetail", () => {
  // The security boundary: ownership is part of the lookup, so another
  // account's item comes back null rather than being fetched and then checked.
  it("filters on the owner as well as the id", async () => {
    await getItemDetail("user_1", "item_1");

    expect(prisma.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item_1", userId: "user_1" } })
    );
  });

  it("returns null when nothing matches", async () => {
    prisma.item.findFirst.mockResolvedValue(null);

    expect(await getItemDetail("user_1", "item_1")).toBeNull();
  });

  it("flattens the item type, tags and collection memberships", async () => {
    const detail = await getItemDetail("user_1", "item_1");

    expect(detail).toEqual({
      id: "item_1",
      title: "useAuth hook",
      description: "Custom authentication hook",
      typeName: "snippet",
      tags: ["react", "auth"],
      isFavorite: true,
      isPinned: false,
      contentType: "TEXT",
      content: "export function useAuth() {}",
      url: null,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      language: "typescript",
      collections: [{ id: "col_1", name: "React Patterns" }],
      createdAt: ROW.createdAt,
      updatedAt: ROW.updatedAt,
    });
  });
});

describe("getItemsByType", () => {
  // Guards against a user-defined type of the same name leaking into a
  // system-type listing.
  it("matches the type name against system types only", async () => {
    await getItemsByType("user_1", "snippet");

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user_1",
          itemType: { name: "snippet", isSystem: true },
        },
      })
    );
  });
});

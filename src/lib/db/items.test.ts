import { beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` factories are hoisted above the imports, so the mock object has to
// come from `vi.hoisted`.
const { prisma } = vi.hoisted(() => ({
  prisma: {
    item: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  getItemDetail,
  getItemsByType,
  toItemDetailPayload,
  updateItem,
} from "@/lib/db/items";

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

const UPDATE_DATA = {
  title: "useAuth hook",
  description: "Custom authentication hook",
  content: "export function useAuth() {}",
  url: null,
  language: "typescript",
  tags: ["react", "auth"],
};

beforeEach(() => {
  prisma.item.findFirst.mockResolvedValue(ROW);
  prisma.item.findMany.mockResolvedValue([]);
  prisma.item.update.mockResolvedValue(ROW);
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

describe("updateItem", () => {
  // Same security boundary as getItemDetail: ownership is part of the `where`,
  // so another account's item matches nothing instead of being written.
  it("scopes the update to the owner as well as the id", async () => {
    await updateItem("user_1", "item_1", UPDATE_DATA);

    expect(prisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item_1", userId: "user_1" } })
    );
  });

  it("replaces the tag set rather than adding to it", async () => {
    await updateItem("user_1", "item_1", UPDATE_DATA);

    const { data } = prisma.item.update.mock.calls[0][0];
    // `set: []` has to be present, or removing a tag in the form would leave it
    // attached to the item.
    expect(data.tags).toEqual({
      set: [],
      connectOrCreate: [
        { where: { name: "react" }, create: { name: "react" } },
        { where: { name: "auth" }, create: { name: "auth" } },
      ],
    });
  });

  it("writes the editable fields and nothing else", async () => {
    await updateItem("user_1", "item_1", UPDATE_DATA);

    const { data } = prisma.item.update.mock.calls[0][0];
    // Type, collections, favorite/pin and timestamps are not this form's to
    // change; a stray key here would silently widen what an edit can do.
    expect(Object.keys(data).sort()).toEqual([
      "content",
      "description",
      "language",
      "tags",
      "title",
      "url",
    ]);
  });

  it("returns null when the item is missing or owned by someone else", async () => {
    prisma.item.update.mockRejectedValue(
      Object.assign(new Error("Record to update not found."), { code: "P2025" })
    );

    expect(await updateItem("user_1", "item_1", UPDATE_DATA)).toBeNull();
  });

  it("rethrows failures that aren't a missing record", async () => {
    prisma.item.update.mockRejectedValue(
      Object.assign(new Error("connection lost"), { code: "P1001" })
    );

    await expect(updateItem("user_1", "item_1", UPDATE_DATA)).rejects.toThrow(
      "connection lost"
    );
  });

  it("returns the refreshed detail so the drawer needs no second fetch", async () => {
    const detail = await updateItem("user_1", "item_1", UPDATE_DATA);

    expect(detail).toMatchObject({
      id: "item_1",
      typeName: "snippet",
      tags: ["react", "auth"],
      collections: [{ id: "col_1", name: "React Patterns" }],
    });
  });
});

describe("toItemDetailPayload", () => {
  it("serializes both timestamps to ISO strings", async () => {
    const detail = await getItemDetail("user_1", "item_1");

    expect(toItemDetailPayload(detail!)).toMatchObject({
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
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

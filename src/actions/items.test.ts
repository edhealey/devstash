import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` has to be mocked or importing the action pulls in Prisma and the
// adapter at module load. `vi.mock` factories are hoisted above the imports, so
// the mock objects come from `vi.hoisted`.
const { auth, updateItem } = vi.hoisted(() => ({
  auth: vi.fn(),
  updateItem: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({
  updateItem,
  // Kept real: the action calls it on the query's return value.
  toItemDetailPayload: (detail: { createdAt: Date; updatedAt: Date }) => ({
    ...detail,
    createdAt: detail.createdAt.toISOString(),
    updatedAt: detail.updatedAt.toISOString(),
  }),
}));

import { updateItemAction } from "@/actions/items";

const SESSION = { user: { id: "user_1" } };

const VALID = {
  title: "useAuth hook",
  description: "Custom authentication hook",
  content: "export function useAuth() {}",
  url: null,
  language: "typescript",
  tags: ["react", "auth"],
};

const UPDATED = {
  id: "item_1",
  title: "useAuth hook",
  createdAt: new Date("2026-01-15T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
};

beforeEach(() => {
  auth.mockResolvedValue(SESSION);
  updateItem.mockResolvedValue(UPDATED);
});

describe("updateItemAction", () => {
  it("rejects an unauthenticated caller before touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await updateItemAction("item_1", VALID);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("rejects a session carrying no user id", async () => {
    auth.mockResolvedValue({ user: {} });

    const result = await updateItemAction("item_1", VALID);

    expect(result.success).toBe(false);
    expect(updateItem).not.toHaveBeenCalled();
  });

  // The client can name any item id, so the owner must come from the session.
  it("scopes the write to the session user, not anything the caller sent", async () => {
    await updateItemAction("item_1", VALID);

    expect(updateItem).toHaveBeenCalledWith(
      "user_1",
      "item_1",
      expect.objectContaining({ title: "useAuth hook" })
    );
  });

  it("returns the updated detail with ISO timestamps on success", async () => {
    const result = await updateItemAction("item_1", VALID);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "item_1",
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("reports a missing or unowned item without saying which", async () => {
    updateItem.mockResolvedValue(null);

    const result = await updateItemAction("item_1", VALID);

    expect(result).toEqual({ success: false, error: "Item not found." });
  });

  it("returns a generic error and does not leak the underlying failure", async () => {
    updateItem.mockRejectedValue(new Error("relation items does not exist"));

    const result = await updateItemAction("item_1", VALID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Something went wrong. Please try again.");
    expect(result.error).not.toContain("relation");
  });

  it("rejects a blank item id", async () => {
    const result = await updateItemAction("", VALID);

    expect(result).toEqual({ success: false, error: "Invalid request." });
    expect(updateItem).not.toHaveBeenCalled();
  });

  describe("validation", () => {
    it("rejects an empty title", async () => {
      const result = await updateItemAction("item_1", { ...VALID, title: "" });

      expect(result).toEqual({ success: false, error: "Title is required." });
      expect(updateItem).not.toHaveBeenCalled();
    });

    // A client-side `trim()` guard is easy to bypass; the server decides.
    it("rejects a whitespace-only title", async () => {
      const result = await updateItemAction("item_1", {
        ...VALID,
        title: "   ",
      });

      expect(result.success).toBe(false);
      expect(updateItem).not.toHaveBeenCalled();
    });

    it("trims the title before saving", async () => {
      await updateItemAction("item_1", { ...VALID, title: "  spaced  " });

      expect(updateItem).toHaveBeenCalledWith(
        "user_1",
        "item_1",
        expect.objectContaining({ title: "spaced" })
      );
    });

    it("rejects a title beyond the length cap", async () => {
      const result = await updateItemAction("item_1", {
        ...VALID,
        title: "x".repeat(201),
      });

      expect(result.success).toBe(false);
      expect(updateItem).not.toHaveBeenCalled();
    });

    it("rejects a malformed URL", async () => {
      const result = await updateItemAction("item_1", {
        ...VALID,
        url: "not a url",
      });

      expect(result.success).toBe(false);
      expect(updateItem).not.toHaveBeenCalled();
    });

    // A bare z.url() accepts these. The drawer renders a URL as text today, but
    // the moment a link item becomes an anchor a stored `javascript:` payload
    // is an XSS vector — so the scheme is checked on the way in, not on the way
    // out.
    it.each(["javascript:alert(1)", "data:text/html,<script>x</script>"])(
      "refuses to store %s as a URL",
      async (url) => {
        const result = await updateItemAction("item_1", { ...VALID, url });

        expect(result.success).toBe(false);
        expect(updateItem).not.toHaveBeenCalled();
      }
    );

    it.each(["https://example.com/docs", "http://localhost:3000"])(
      "accepts %s",
      async (url) => {
        const result = await updateItemAction("item_1", { ...VALID, url });

        expect(result.success).toBe(true);
      }
    );

    // An emptied input arrives as "", and the column should end up null rather
    // than holding an empty string.
    it("stores cleared optional fields as null", async () => {
      await updateItemAction("item_1", {
        ...VALID,
        description: "",
        url: "   ",
        language: "",
      });

      expect(updateItem).toHaveBeenCalledWith(
        "user_1",
        "item_1",
        expect.objectContaining({ description: null, url: null, language: null })
      );
    });

    // Trimming content would eat a code block's leading indentation and
    // trailing newline, so it is stored verbatim once it has any content.
    it("preserves surrounding whitespace in content", async () => {
      await updateItemAction("item_1", {
        ...VALID,
        content: "  indented();\n",
      });

      expect(updateItem).toHaveBeenCalledWith(
        "user_1",
        "item_1",
        expect.objectContaining({ content: "  indented();\n" })
      );
    });

    it("treats whitespace-only content as cleared", async () => {
      await updateItemAction("item_1", { ...VALID, content: "  \n " });

      expect(updateItem).toHaveBeenCalledWith(
        "user_1",
        "item_1",
        expect.objectContaining({ content: null })
      );
    });

    it("trims tags and drops the blanks a trailing comma leaves behind", async () => {
      await updateItemAction("item_1", {
        ...VALID,
        tags: [" react ", "", "  ", "hooks"],
      });

      expect(updateItem).toHaveBeenCalledWith(
        "user_1",
        "item_1",
        expect.objectContaining({ tags: ["react", "hooks"] })
      );
    });

    // Tag names are unique, so a duplicate would otherwise hit connectOrCreate
    // twice for the same row.
    it("collapses duplicate tags", async () => {
      await updateItemAction("item_1", {
        ...VALID,
        tags: ["react", "react ", " react"],
      });

      expect(updateItem).toHaveBeenCalledWith(
        "user_1",
        "item_1",
        expect.objectContaining({ tags: ["react"] })
      );
    });
  });
});

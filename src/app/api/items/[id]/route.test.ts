import { beforeEach, describe, expect, it, vi } from "vitest";

// The route's own logic is the auth gate, the not-found answer, and the
// response shape — the query itself is mocked out. `@/auth` has to be mocked or
// the import pulls in Prisma and the adapter at module load.
//
// `vi.mock` factories are hoisted above the imports, so anything they close
// over must come from `vi.hoisted`.
const { auth, getItemDetail } = vi.hoisted(() => ({
  auth: vi.fn(),
  getItemDetail: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({ getItemDetail }));

import { GET } from "@/app/api/items/[id]/route";

const SESSION = { user: { id: "user_1" } };
const ITEM = {
  id: "item_1",
  title: "useAuth hook",
  typeName: "snippet",
  content: "export function useAuth() {}",
};

function get(id = "item_1") {
  return GET(new Request(`http://localhost/api/items/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  auth.mockResolvedValue(SESSION);
  getItemDetail.mockResolvedValue(ITEM);
});

describe("GET /api/items/[id]", () => {
  it("rejects an unauthenticated caller before querying", async () => {
    auth.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      error: "You must be signed in.",
    });
    expect(getItemDetail).not.toHaveBeenCalled();
  });

  it("rejects a session with no user id", async () => {
    auth.mockResolvedValue({ user: {} });

    const response = await get();

    expect(response.status).toBe(401);
    expect(getItemDetail).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the session user, not the request", async () => {
    await get("item_9");

    expect(getItemDetail).toHaveBeenCalledWith("user_1", "item_9");
  });

  it("returns the item detail for the owner", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: ITEM });
  });

  it("answers 404 when the item is missing or owned by someone else", async () => {
    getItemDetail.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      error: "Item not found.",
    });
  });

  it("answers 500 with a generic message when the query throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getItemDetail.mockRejectedValue(new Error("connection terminated"));

    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    // The underlying failure is logged, never returned.
    expect(body.error).toBe("Could not load this item.");
  });
});

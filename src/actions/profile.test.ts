import { beforeEach, describe, expect, it, vi } from "vitest";

// Everything the action touches beyond its own logic is mocked: no database, no
// real bcrypt work, no NextAuth session. `@/auth` in particular has to be mocked
// or importing the action pulls in Prisma and the adapter at module load.
//
// `vi.mock` calls are hoisted above the imports, so anything their factories
// close over must be declared in `vi.hoisted` — a plain `const` up here would
// still be uninitialized when the factory runs.
const { auth, signOut, prisma, bcrypt } = vi.hoisted(() => ({
  auth: vi.fn(),
  signOut: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  bcrypt: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth, signOut }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("bcryptjs", () => ({ default: bcrypt }));

import { changePasswordAction, deleteAccountAction } from "@/actions/profile";

const SESSION = { user: { id: "user_1" } };
const VALID = {
  currentPassword: "old-password",
  newPassword: "new-password",
  confirmPassword: "new-password",
};

// `clearMocks` in vitest.config.ts clears call history between tests; each test
// starts from this happy-path setup and overrides only what it exercises.
beforeEach(() => {
  auth.mockResolvedValue(SESSION);
  prisma.user.findUnique.mockResolvedValue({ password: "$2a$12$storedhash" });
  prisma.user.update.mockResolvedValue({});
  bcrypt.compare.mockResolvedValue(true);
  bcrypt.hash.mockResolvedValue("$2a$12$newhash");
});

describe("changePasswordAction", () => {
  it("changes the password for the signed-in user", async () => {
    const result = await changePasswordAction(VALID);

    expect(result).toEqual({ success: true });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      VALID.currentPassword,
      "$2a$12$storedhash"
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { password: "$2a$12$newhash" },
    });
  });

  it("hashes the new password with 12 bcrypt rounds", async () => {
    await changePasswordAction(VALID);

    expect(bcrypt.hash).toHaveBeenCalledWith(VALID.newPassword, 12);
  });

  it("never stores the new password in plaintext", async () => {
    await changePasswordAction(VALID);

    const [{ data }] = prisma.user.update.mock.calls[0];
    expect(data.password).not.toBe(VALID.newPassword);
  });

  it("targets the id from the session, not one supplied by the caller", async () => {
    // The action takes no user id — this is the guard against one account
    // changing another's password.
    auth.mockResolvedValue({ user: { id: "user_2" } });

    await changePasswordAction(VALID);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_2" },
      select: { password: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_2" } })
    );
  });

  it("rejects an unauthenticated caller before touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await changePasswordAction(VALID);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a session with no user id", async () => {
    auth.mockResolvedValue({ user: {} });

    const result = await changePasswordAction(VALID);

    expect(result.success).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a new password shorter than 8 characters", async () => {
    const result = await changePasswordAction({
      ...VALID,
      newPassword: "short7c",
      confirmPassword: "short7c",
    });

    expect(result).toEqual({
      success: false,
      error: "New password must be at least 8 characters.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("accepts a new password of exactly 8 characters", async () => {
    const result = await changePasswordAction({
      ...VALID,
      newPassword: "exactly8",
      confirmPassword: "exactly8",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects a confirmation that does not match", async () => {
    const result = await changePasswordAction({
      ...VALID,
      confirmPassword: "something-else",
    });

    expect(result).toEqual({
      success: false,
      error: "New passwords do not match.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects non-string input", async () => {
    const result = await changePasswordAction({
      currentPassword: "old-password",
      newPassword: undefined as unknown as string,
      confirmPassword: "new-password",
    });

    expect(result).toEqual({ success: false, error: "Invalid request." });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses accounts with no password, e.g. GitHub-only sign-ups", async () => {
    prisma.user.findUnique.mockResolvedValue({ password: null });

    const result = await changePasswordAction(VALID);

    expect(result).toEqual({
      success: false,
      error: "Password change isn't available for this account.",
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not change the password when the current one is wrong", async () => {
    bcrypt.compare.mockResolvedValue(false);

    const result = await changePasswordAction(VALID);

    expect(result).toEqual({
      success: false,
      error: "Current password is incorrect.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("verifies the current password before hashing the new one", async () => {
    // Order matters: a failed compare must short-circuit, so a wrong current
    // password costs nothing beyond the one comparison.
    bcrypt.compare.mockResolvedValue(false);

    await changePasswordAction(VALID);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("returns a generic error and logs when the database throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    prisma.user.update.mockRejectedValue(new Error("connection lost"));

    const result = await changePasswordAction(VALID);

    // No internal detail leaks to the client.
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(error).toHaveBeenCalled();
  });
});

describe("deleteAccountAction", () => {
  it("deletes the signed-in user and ends the session", async () => {
    prisma.user.delete.mockResolvedValue({});

    await deleteAccountAction();

    // One delete; the schema's onDelete: Cascade removes the rest.
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user_1" },
    });
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("deletes nothing when there is no session", async () => {
    auth.mockResolvedValue(null);

    await deleteAccountAction();

    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("deletes the session's user, never a caller-supplied id", async () => {
    auth.mockResolvedValue({ user: { id: "user_2" } });
    prisma.user.delete.mockResolvedValue({});

    await deleteAccountAction();

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user_2" },
    });
  });
});

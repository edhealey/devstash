import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// See src/actions/profile.test.ts for why these live in `vi.hoisted`.
const { prisma, sendPasswordResetEmail, bcrypt } = vi.hoisted(() => ({
  prisma: {
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  sendPasswordResetEmail: vi.fn(),
  bcrypt: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail }));
vi.mock("bcryptjs", () => ({ default: bcrypt }));

import {
  consumePasswordResetToken,
  issuePasswordResetEmail,
} from "@/lib/password-reset";

const EMAIL = "user@example.com";
const RESET_IDENTIFIER = `password-reset:${EMAIL}`;
const NEW_PASSWORD = "new-password";
const NOW = new Date("2026-07-29T12:00:00Z");

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// The raw token only ever exists in the emailed link.
function tokenFromLastEmail(): string {
  const [{ resetUrl }] = sendPasswordResetEmail.mock.calls.at(-1) as [
    { resetUrl: string },
  ];

  return new URL(resetUrl).searchParams.get("token")!;
}

function validResetRecord(rawToken = "raw") {
  return {
    identifier: RESET_IDENTIFIER,
    token: sha256(rawToken),
    expires: new Date(Date.now() + 60_000),
  };
}

beforeEach(() => {
  prisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
  prisma.verificationToken.create.mockResolvedValue({});
  prisma.verificationToken.delete.mockResolvedValue({});
  prisma.user.update.mockResolvedValue({});
  prisma.user.findUnique.mockResolvedValue({
    id: "user_1",
    emailVerified: new Date("2026-07-01T00:00:00Z"),
  });
  sendPasswordResetEmail.mockResolvedValue(true);
  bcrypt.hash.mockResolvedValue("$2a$12$newhash");
});

describe("issuePasswordResetEmail", () => {
  it("mails a link to /reset-password and reports success", async () => {
    vi.stubEnv("APP_URL", "https://devstash.example.com");

    await expect(issuePasswordResetEmail(EMAIL, "Ada")).resolves.toBe(true);

    const [{ to, name, resetUrl }] = sendPasswordResetEmail.mock.calls[0];
    expect(to).toBe(EMAIL);
    expect(name).toBe("Ada");
    expect(resetUrl).toMatch(
      /^https:\/\/devstash\.example\.com\/reset-password\?token=/
    );
  });

  it("stores only the hash of the token, never the token itself", async () => {
    await issuePasswordResetEmail(EMAIL, null);

    const rawToken = tokenFromLastEmail();
    const [{ data }] = prisma.verificationToken.create.mock.calls[0];

    expect(data.token).not.toBe(rawToken);
    expect(data.token).toBe(sha256(rawToken));
  });

  it("namespaces the identifier so reset and verification tokens can't be confused", async () => {
    await issuePasswordResetEmail(EMAIL, null);

    const [{ data }] = prisma.verificationToken.create.mock.calls[0];
    expect(data.identifier).toBe(RESET_IDENTIFIER);
  });

  it("issues an unguessable token, different every time", async () => {
    await issuePasswordResetEmail(EMAIL, null);
    const first = tokenFromLastEmail();

    await issuePasswordResetEmail(EMAIL, null);
    const second = tokenFromLastEmail();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).not.toBe(first);
  });

  it("invalidates outstanding reset tokens for the address, and only those", async () => {
    await issuePasswordResetEmail(EMAIL, null);

    // Scoped to the namespaced identifier: issuing a reset must not wipe the
    // user's pending email-verification token.
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: RESET_IDENTIFIER },
    });
  });

  it("expires the token one hour out — shorter than a verification link", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    await issuePasswordResetEmail(EMAIL, null);
    const [{ data }] = prisma.verificationToken.create.mock.calls[0];

    vi.useRealTimers();

    expect(data.expires.getTime() - NOW.getTime()).toBe(60 * 60 * 1000);
  });

  it("reports failure instead of throwing when the send fails", async () => {
    sendPasswordResetEmail.mockResolvedValue(false);

    await expect(issuePasswordResetEmail(EMAIL, null)).resolves.toBe(false);
  });

  it("reports failure instead of throwing when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    prisma.verificationToken.create.mockRejectedValue(new Error("db down"));

    await expect(issuePasswordResetEmail(EMAIL, null)).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
  });
});

describe("consumePasswordResetToken", () => {
  it("resets the password for a valid token", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());

    await expect(
      consumePasswordResetToken("raw", NEW_PASSWORD)
    ).resolves.toBe("reset");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        password: "$2a$12$newhash",
        emailVerified: new Date("2026-07-01T00:00:00Z"),
      },
    });
  });

  it("hashes the new password with 12 bcrypt rounds", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    expect(bcrypt.hash).toHaveBeenCalledWith(NEW_PASSWORD, 12);
  });

  it("never stores the new password in plaintext", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    const [{ data }] = prisma.user.update.mock.calls[0];
    expect(data.password).not.toBe(NEW_PASSWORD);
  });

  it("resolves the account from the token, not from caller input", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    // The email is recovered by stripping the namespace prefix — this is what
    // stops one account's link from resetting another's password.
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: EMAIL },
      select: { id: true, emailVerified: true },
    });
  });

  it("looks the token up by hash, not by its raw value", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(null);

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({
      where: { token: sha256("raw") },
    });
  });

  it("consumes the token so a replayed link is rejected", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: sha256("raw") },
    });
  });

  it("rejects an unknown token without touching anything", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(null);

    await expect(
      consumePasswordResetToken("nope", NEW_PASSWORD)
    ).resolves.toBe("invalid");
    expect(prisma.verificationToken.delete).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses an email-verification token and leaves that row intact", async () => {
    // A verification link must not double as a password reset. The row belongs
    // to the other flow, so it is neither consumed nor honored here.
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: sha256("raw"),
      expires: new Date(Date.now() + 60_000),
    });

    await expect(
      consumePasswordResetToken("raw", NEW_PASSWORD)
    ).resolves.toBe("invalid");
    expect(prisma.verificationToken.delete).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("reports an expired token, consumes it, and changes nothing", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: RESET_IDENTIFIER,
      token: sha256("raw"),
      expires: new Date(Date.now() - 1),
    });

    await expect(
      consumePasswordResetToken("raw", NEW_PASSWORD)
    ).resolves.toBe("expired");
    expect(prisma.verificationToken.delete).toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a token whose account no longer exists", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      consumePasswordResetToken("raw", NEW_PASSWORD)
    ).resolves.toBe("invalid");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("verifies the email as a side effect when it wasn't verified yet", async () => {
    // Completing a reset proves the user controls the inbox.
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());
    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: null,
    });

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    const [{ data }] = prisma.user.update.mock.calls[0];
    expect(data.emailVerified).toBeInstanceOf(Date);
  });

  it("leaves an existing verification timestamp untouched", async () => {
    const verifiedAt = new Date("2026-07-01T00:00:00Z");
    prisma.verificationToken.findUnique.mockResolvedValue(validResetRecord());
    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: verifiedAt,
    });

    await consumePasswordResetToken("raw", NEW_PASSWORD);

    const [{ data }] = prisma.user.update.mock.calls[0];
    expect(data.emailVerified).toEqual(verifiedAt);
  });
});

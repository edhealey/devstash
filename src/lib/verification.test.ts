import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// See src/actions/profile.test.ts for why these live in `vi.hoisted`.
const { prisma, sendVerificationEmail } = vi.hoisted(() => ({
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
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/email", () => ({ sendVerificationEmail }));

import {
  consumeVerificationToken,
  issueVerificationEmail,
} from "@/lib/verification";

const EMAIL = "user@example.com";
const NOW = new Date("2026-07-29T12:00:00Z");

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// The raw token only ever exists in the emailed link, so that's where the test
// has to read it from.
function tokenFromLastEmail(): string {
  const [{ verifyUrl }] = sendVerificationEmail.mock.calls.at(-1) as [
    { verifyUrl: string },
  ];

  return new URL(verifyUrl).searchParams.get("token")!;
}

beforeEach(() => {
  prisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
  prisma.verificationToken.create.mockResolvedValue({});
  prisma.verificationToken.delete.mockResolvedValue({});
  prisma.user.update.mockResolvedValue({});
  sendVerificationEmail.mockResolvedValue(true);
});

describe("issueVerificationEmail", () => {
  it("mails a link and reports success", async () => {
    const result = await issueVerificationEmail(EMAIL, "Ada");

    expect(result).toBe(true);
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: EMAIL, name: "Ada" })
    );
  });

  it("stores only the hash of the token, never the token itself", async () => {
    await issueVerificationEmail(EMAIL, "Ada");

    const rawToken = tokenFromLastEmail();
    const [{ data }] = prisma.verificationToken.create.mock.calls[0];

    // A leaked database row must not be replayable as a valid link.
    expect(data.token).not.toBe(rawToken);
    expect(data.token).toBe(sha256(rawToken));
    expect(data.identifier).toBe(EMAIL);
  });

  it("issues a token with enough entropy to be unguessable", async () => {
    await issueVerificationEmail(EMAIL, "Ada");

    // 32 random bytes, hex-encoded.
    expect(tokenFromLastEmail()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("issues a different token every time", async () => {
    await issueVerificationEmail(EMAIL, "Ada");
    const first = tokenFromLastEmail();

    await issueVerificationEmail(EMAIL, "Ada");
    const second = tokenFromLastEmail();

    expect(second).not.toBe(first);
  });

  it("invalidates outstanding tokens for the address before issuing", async () => {
    await issueVerificationEmail(EMAIL, "Ada");

    // Only the most recent link may work.
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: EMAIL },
    });
    expect(
      prisma.verificationToken.deleteMany.mock.invocationCallOrder[0]
    ).toBeLessThan(prisma.verificationToken.create.mock.invocationCallOrder[0]);
  });

  it("expires the token 24 hours out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    await issueVerificationEmail(EMAIL, "Ada");
    const [{ data }] = prisma.verificationToken.create.mock.calls[0];

    vi.useRealTimers();

    expect(data.expires.getTime() - NOW.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("builds the link from APP_URL", async () => {
    vi.stubEnv("APP_URL", "https://devstash.example.com");

    await issueVerificationEmail(EMAIL, "Ada");
    const [{ verifyUrl }] = sendVerificationEmail.mock.calls[0];

    expect(verifyUrl).toMatch(
      /^https:\/\/devstash\.example\.com\/api\/auth\/verify-email\?token=/
    );
  });

  it("falls back to localhost when APP_URL is unset", async () => {
    vi.stubEnv("APP_URL", undefined);

    await issueVerificationEmail(EMAIL, "Ada");
    const [{ verifyUrl }] = sendVerificationEmail.mock.calls[0];

    expect(verifyUrl).toMatch(/^http:\/\/localhost:3000\//);
  });

  it("reports failure instead of throwing when the send fails", async () => {
    // Registration stays a 201 and routes the user to the resend page — it must
    // not 500 because Resend was unhappy.
    sendVerificationEmail.mockResolvedValue(false);

    await expect(issueVerificationEmail(EMAIL, "Ada")).resolves.toBe(false);
  });

  it("reports failure instead of throwing when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    prisma.verificationToken.create.mockRejectedValue(new Error("db down"));

    await expect(issueVerificationEmail(EMAIL, "Ada")).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
  });
});

describe("consumeVerificationToken", () => {
  it("verifies the account for a valid token", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: sha256("raw"),
      expires: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: null,
    });

    await expect(consumeVerificationToken("raw")).resolves.toBe("verified");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it("looks the token up by hash, not by its raw value", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(null);

    await consumeVerificationToken("raw");

    expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({
      where: { token: sha256("raw") },
    });
  });

  it("rejects an unknown token", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(null);

    await expect(consumeVerificationToken("nope")).resolves.toBe("invalid");
    expect(prisma.verificationToken.delete).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("consumes the token so a replayed link is rejected", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: sha256("raw"),
      expires: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: null,
    });

    await consumeVerificationToken("raw");

    expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: sha256("raw") },
    });
  });

  it("reports an expired token and still consumes it", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: sha256("raw"),
      expires: new Date(Date.now() - 1),
    });

    await expect(consumeVerificationToken("raw")).resolves.toBe("expired");
    // Single-use regardless of expiry — an expired row is not left lying around.
    expect(prisma.verificationToken.delete).toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("reports an already-verified account without re-stamping it", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: sha256("raw"),
      expires: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: new Date("2026-07-01T00:00:00Z"),
    });

    await expect(consumeVerificationToken("raw")).resolves.toBe(
      "already-verified"
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a token whose account no longer exists", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: sha256("raw"),
      expires: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(consumeVerificationToken("raw")).resolves.toBe("invalid");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

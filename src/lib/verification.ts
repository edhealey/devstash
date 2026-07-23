import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// The raw token goes in the email link; only its SHA-256 hash is stored, so a
// leaked database row can't be replayed as a valid verification link.
function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

// Issues a fresh token for an address, invalidating any outstanding ones so
// only the most recent link works.
async function createVerificationToken(email: string) {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const rawToken = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(rawToken),
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return rawToken;
}

// Creates a token and mails the link. Never throws — a false return means the
// account exists but the user needs to request a new link.
export async function issueVerificationEmail(email: string, name: string | null) {
  try {
    const rawToken = await createVerificationToken(email);
    const verifyUrl = `${appUrl()}/api/auth/verify-email?token=${rawToken}`;
    return await sendVerificationEmail({ to: email, name, verifyUrl });
  } catch (error) {
    console.error("[verification] Failed to issue verification email:", error);
    return false;
  }
}

export type VerificationResult =
  | "verified"
  | "already-verified"
  | "expired"
  | "invalid";

// Single-use: the token row is deleted on any match, expired or not.
export async function consumeVerificationToken(
  rawToken: string
): Promise<VerificationResult> {
  const token = hashToken(rawToken);

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    return "invalid";
  }

  await prisma.verificationToken.delete({ where: { token } });

  if (record.expires < new Date()) {
    return "expired";
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    return "invalid";
  }
  if (user.emailVerified) {
    return "already-verified";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  return "verified";
}

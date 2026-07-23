import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — shorter than verification links.

// Reset tokens share the VerificationToken table with email-verification
// tokens. The identifier is namespaced so the two can never be confused: a
// verification link can't be replayed against the reset endpoint and vice
// versa. The email itself is stored after the prefix.
const IDENTIFIER_PREFIX = "password-reset:";

function resetIdentifier(email: string) {
  return `${IDENTIFIER_PREFIX}${email}`;
}

// The raw token goes in the email link; only its SHA-256 hash is stored, so a
// leaked database row can't be replayed as a valid reset link.
function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

// Issues a fresh reset token for an address, invalidating any outstanding ones
// so only the most recent link works.
async function createResetToken(email: string) {
  await prisma.verificationToken.deleteMany({
    where: { identifier: resetIdentifier(email) },
  });

  const rawToken = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: resetIdentifier(email),
      token: hashToken(rawToken),
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return rawToken;
}

// Creates a token and mails the link. Never throws — a false return means the
// account exists but the user needs to request a new link.
export async function issuePasswordResetEmail(
  email: string,
  name: string | null
) {
  try {
    const rawToken = await createResetToken(email);
    const resetUrl = `${appUrl()}/reset-password?token=${rawToken}`;
    return await sendPasswordResetEmail({ to: email, name, resetUrl });
  } catch (error) {
    console.error("[password-reset] Failed to issue reset email:", error);
    return false;
  }
}

export type PasswordResetResult = "reset" | "expired" | "invalid";

// Single-use: consumes the token and, on success, updates the user's password.
// The token row is deleted once we've confirmed it's a reset token (matched by
// namespaced identifier) — expired or not — so it can't be replayed.
export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string
): Promise<PasswordResetResult> {
  const token = hashToken(rawToken);

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  // Missing, or a token that isn't a reset token (e.g. an email-verification
  // token) — leave non-reset rows untouched.
  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return "invalid";
  }

  await prisma.verificationToken.delete({ where: { token } });

  if (record.expires < new Date()) {
    return "expired";
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    return "invalid";
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      // Completing a reset proves the user controls the inbox, so treat it as
      // verification too if they hadn't confirmed yet.
      emailVerified: user.emailVerified ?? new Date(),
    },
  });

  return "reset";
}

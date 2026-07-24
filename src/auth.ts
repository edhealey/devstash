import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { EMAIL_NOT_VERIFIED_CODE, RATE_LIMITED_CODE } from "@/lib/auth-errors";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import {
  checkRateLimit,
  getClientIp,
  rateLimitKey,
  resetRateLimit,
} from "@/lib/rate-limit";

// Full config: the edge-safe providers/callbacks plus the Prisma adapter.
// The adapter persists users/accounts on OAuth sign-in; sessions stay in a JWT.
//
// The Credentials provider from auth.config.ts is a placeholder (authorize
// returns null). Here — in the Node runtime, where bcrypt and Prisma are
// available — we swap it for one that actually validates email/password.
// Surfaces as `code` on the signIn() result so the login form can tell an
// unverified account apart from bad credentials. Safe to expose: it is only
// thrown after the password has already been verified.
class EmailNotVerifiedError extends CredentialsSignin {
  code = EMAIL_NOT_VERIFIED_CODE;
}

// Too many sign-in attempts for this IP + email. Thrown before the password is
// checked, so it says nothing about whether the account exists.
class RateLimitedError extends CredentialsSignin {
  code = RATE_LIMITED_CODE;
}

const credentials = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  // NextAuth owns /api/auth/callback/credentials, so the login rate limit has
  // to be enforced here — it's the first code of ours the request reaches, and
  // `request` carries the headers we need for the client IP.
  async authorize(credentials, request) {
    const email = credentials?.email;
    const password = credentials?.password;
    if (typeof email !== "string" || typeof password !== "string") {
      return null;
    }

    const normalizedEmail = email.toLowerCase();
    const limitKey = rateLimitKey(getClientIp(request), normalizedEmail);

    const limit = await checkRateLimit("login", limitKey);
    if (!limit.success) {
      throw new RateLimitedError();
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user?.password) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return null;
    }

    // Checked only after the password matches, so a stranger guessing emails
    // learns nothing about which addresses are registered. Skipped entirely
    // when the verification gate is disabled.
    if (isEmailVerificationEnabled() && !user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    // Proving the password clears the slate, so someone who fat-fingers it a
    // few times isn't locked out of their own account for the rest of the
    // window. Only failed attempts accumulate.
    await resetRateLimit("login", limitKey);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  // Replace the edge placeholder Credentials provider with the real one.
  providers: authConfig.providers.map((provider) =>
    typeof provider !== "function" && provider.id === "credentials"
      ? credentials
      : provider
  ),
});

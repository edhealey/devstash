import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

// Full config: the edge-safe providers/callbacks plus the Prisma adapter.
// The adapter persists users/accounts on OAuth sign-in; sessions stay in a JWT.
//
// The Credentials provider from auth.config.ts is a placeholder (authorize
// returns null). Here — in the Node runtime, where bcrypt and Prisma are
// available — we swap it for one that actually validates email/password.
const credentials = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = credentials?.email;
    const password = credentials?.password;
    if (typeof email !== "string" || typeof password !== "string") {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user?.password) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return null;
    }

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

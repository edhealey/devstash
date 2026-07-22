import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

// Full config: the edge-safe providers/callbacks plus the Prisma adapter.
// The adapter persists users/accounts on OAuth sign-in; sessions stay in a JWT.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
});

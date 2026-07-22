import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible config: providers + callbacks only, no adapter or DB access.
// This is safe to import from the proxy, which must not run database queries.
// GitHub reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET from the environment.
//
// The Credentials provider here is a placeholder: `authorize` always returns
// null so no bcrypt/DB code runs in the edge runtime. The real validation is
// supplied in auth.ts, which overrides this provider in the Node runtime.
export const authConfig = {
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Expose the user id (JWT subject) on the session for use across the app.
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

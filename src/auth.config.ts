import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

// Edge-compatible config: providers + callbacks only, no adapter or DB access.
// This is safe to import from the proxy, which must not run database queries.
// GitHub reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET from the environment.
export const authConfig = {
  providers: [GitHub],
  session: { strategy: "jwt" },
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

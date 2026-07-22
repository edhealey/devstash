import type { DefaultSession } from "next-auth";

// Augment the Session type so `session.user.id` is available and typed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

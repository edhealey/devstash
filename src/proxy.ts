import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Instantiate NextAuth with the edge-safe config only (no adapter / DB access)
// so the proxy stays lightweight.
const { auth } = NextAuth(authConfig);

// Protect the dashboard: send unauthenticated users to NextAuth's default
// sign-in page, preserving where they were headed via callbackUrl.
export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  if (isOnDashboard && !isLoggedIn) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};

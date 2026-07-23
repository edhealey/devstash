import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Instantiate NextAuth with the edge-safe config only (no adapter / DB access)
// so the proxy stays lightweight.
const { auth } = NextAuth(authConfig);

// Protect authenticated areas: send unauthenticated users to the custom
// sign-in page, preserving where they were headed via callbackUrl.
const PROTECTED_PREFIXES = ["/dashboard", "/profile"];

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL("/login", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};

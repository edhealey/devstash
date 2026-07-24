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
    // Pass the destination as a relative path. The login page only accepts
    // same-origin relative callbacks, so an absolute URL here would be
    // discarded and the user would land on /dashboard instead of where they
    // were headed.
    signInUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};

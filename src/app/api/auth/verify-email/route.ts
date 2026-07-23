import { NextResponse } from "next/server";

import { consumeVerificationToken } from "@/lib/verification";

// GET so the link works straight from an email client. Always redirects: a
// success lands on /login with a confirmation, anything else lands on
// /verify-email where the user can request a fresh link.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", origin));
  }

  try {
    const result = await consumeVerificationToken(token);

    // "already-verified" is a success from the user's point of view — their
    // email is confirmed either way, so don't send them to an error screen.
    if (result === "verified" || result === "already-verified") {
      return NextResponse.redirect(new URL("/login?verified=1", origin));
    }

    return NextResponse.redirect(
      new URL(`/verify-email?status=${result}`, origin)
    );
  } catch (error) {
    console.error("[verify-email] Failed to verify token:", error);
    return NextResponse.redirect(new URL("/verify-email?status=error", origin));
  }
}

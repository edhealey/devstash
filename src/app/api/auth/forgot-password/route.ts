import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { issuePasswordResetEmail } from "@/lib/password-reset";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Starts a password reset: issues a reset link and emails it. The response is
// deliberately identical whether or not the address is registered, so this
// can't be used to enumerate accounts.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { email } = (body ?? {}) as { email?: unknown };

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { name: true, email: true, password: true },
    });

    // Only send for accounts that actually have a password to reset —
    // GitHub-only accounts have nothing to reset. Stay silent otherwise rather
    // than confirming the address exists.
    if (user?.password) {
      await issuePasswordResetEmail(user.email, user.name);
    }
  } catch (error) {
    console.error("[forgot-password] Failed to issue reset email:", error);
  }

  return NextResponse.json({ success: true, data: null }, { status: 200 });
}

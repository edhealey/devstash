import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/verification";
import { isEmailVerificationEnabled } from "@/lib/email-verification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Issues a fresh verification link. The response is deliberately identical
// whether or not the address is registered, so this can't be used to enumerate
// accounts.
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

  // With the gate off there's nothing to verify; stay silent like the
  // account-doesn't-exist path so behavior is indistinguishable.
  if (!isEmailVerificationEnabled()) {
    return NextResponse.json({ success: true, data: null }, { status: 200 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { name: true, email: true, emailVerified: true },
    });

    // Only send for accounts that actually need verifying; stay silent
    // otherwise rather than confirming the address exists.
    if (user && !user.emailVerified) {
      await issueVerificationEmail(user.email, user.name);
    }
  } catch (error) {
    console.error("[resend-verification] Failed to issue email:", error);
  }

  return NextResponse.json({ success: true, data: null }, { status: 200 });
}

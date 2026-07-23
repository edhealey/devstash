import { NextResponse } from "next/server";

import { consumePasswordResetToken } from "@/lib/password-reset";

const MIN_PASSWORD_LENGTH = 8;

// Completes a password reset: validates the token and the new password, then
// updates the account. Unlike the forgot-password endpoint there's nothing to
// enumerate here — the caller already holds a single-use token.
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

  const { token, password, confirmPassword } = (body ?? {}) as {
    token?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  };

  if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return NextResponse.json(
      { success: false, error: "All fields are required." },
      { status: 400 }
    );
  }

  if (!token.trim()) {
    return NextResponse.json(
      { success: false, error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { success: false, error: "Passwords do not match." },
      { status: 400 }
    );
  }

  try {
    const result = await consumePasswordResetToken(token, password);

    if (result !== "reset") {
      return NextResponse.json(
        {
          success: false,
          error: "This reset link is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch (error) {
    console.error("[reset-password] Failed to reset password:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

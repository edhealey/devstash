import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/verification";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

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

  const { name, email, password, confirmPassword } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  };

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return NextResponse.json(
      { success: false, error: "All fields are required." },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    return NextResponse.json(
      { success: false, error: "Name is required." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid email address." },
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

  // Keyed by IP alone: the point is to stop one host from mass-creating
  // accounts (each of which sends an email), so the address must not vary it.
  // Counted only once the submission is well-formed — creating an account is
  // what we're limiting, and a rejected one costs us neither a row nor an
  // email. Charging for validation errors would lock someone out for an hour
  // over a mistyped password.
  const limit = await checkRateLimit("register", getClientIp(request));
  if (!limit.success) {
    return rateLimitResponse(limit);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationEnabled = isEmailVerificationEnabled();

    // With verification on, emailVerified stays null until the user clicks the
    // link we send below. With it off, the account is usable immediately.
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: verificationEnabled ? null : new Date(),
      },
      select: { id: true, name: true, email: true },
    });

    // Only send a link when verification is required. A send failure isn't
    // fatal — the account exists and the user can request a new link from
    // /verify-email.
    const emailSent = verificationEnabled
      ? await issueVerificationEmail(user.email, user.name)
      : false;

    return NextResponse.json(
      { success: true, data: { ...user, emailSent, verificationEnabled } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register] Failed to create user:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

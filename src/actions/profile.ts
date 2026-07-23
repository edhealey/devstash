"use server";

import bcrypt from "bcryptjs";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;

export interface ActionResult {
  success: boolean;
  error?: string;
}

// Changes the signed-in user's password. Verifies the current password before
// setting the new one, so a hijacked-but-unlocked session can't silently swap
// the password. Available only to accounts that already have a password
// (email/password sign-up) — GitHub-only accounts have nothing to compare.
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be signed in." };
  }

  const { currentPassword, newPassword, confirmPassword } = input;

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { success: false, error: "Invalid request." };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "New passwords do not match." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      return {
        success: false,
        error: "Password change isn't available for this account.",
      };
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return { success: false, error: "Current password is incorrect." };
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { success: true };
  } catch (error) {
    console.error("[profile] Failed to change password:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Permanently deletes the signed-in user's account. The schema cascades the
// delete to their items, collections, item-collections, custom types, and
// auth accounts/sessions. Ends the session and returns to the home page.
export async function deleteAccountAction(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/" });
}

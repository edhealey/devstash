"use server";

import { signOut } from "@/auth";

// Server action for the sign-out button in the sidebar footer. Ends the
// session and returns the user to the home page.
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

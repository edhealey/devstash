import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const resetToken = typeof token === "string" ? token : "";

  // No token in the link — nothing to reset. Point the user back to the start
  // of the flow rather than rendering a form that can only fail.
  if (!resetToken) {
    return (
      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">This reset link is invalid</h1>
          <p className="text-sm text-muted-foreground">
            The link is missing or malformed. Request a new one to continue.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={resetToken} />;
}

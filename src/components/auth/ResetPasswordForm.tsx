"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
      return;
    }

    toast.success("Password updated! You can now sign in.");
    router.push("/login?reset=1");
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter a new password for your DevStash account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm new password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

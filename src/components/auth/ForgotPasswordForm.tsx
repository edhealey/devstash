"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
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

    // The API answers the same way whether or not the account exists, so the
    // confirmation here has to stay just as non-committal.
    setSent(true);
    setPending(false);
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      {sent ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          If that address has a DevStash account, a password reset link is on its
          way. The link expires in 1 hour.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

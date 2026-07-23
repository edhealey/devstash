"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { changePasswordAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordCard() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await changePasswordAction({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setPending(false);
      return;
    }

    formRef.current?.reset();
    setPending(false);
    toast.success("Password updated.");
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1">
        <h3 className="font-medium">Change password</h3>
        <p className="text-sm text-muted-foreground">
          Update the password you use to sign in.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="currentPassword" className="text-sm font-medium">
            Current password
          </label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium">
            New password
          </label>
          <Input
            id="newPassword"
            name="newPassword"
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
            placeholder="Re-enter your new password"
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}

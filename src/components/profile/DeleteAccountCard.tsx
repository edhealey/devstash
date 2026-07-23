"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { deleteAccountAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteAccountCard() {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      // On success the action signs out and redirects, so control never
      // returns here. A thrown error means the delete failed server-side.
      await deleteAccountAction();
    } catch {
      setPending(false);
      toast.error("Couldn't delete your account. Please try again.");
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-destructive/40 bg-card p-6">
      <div className="space-y-1">
        <h3 className="font-medium text-destructive">Delete account</h3>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all of your items, collections,
          and data. This cannot be undone.
        </p>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="size-4" />
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and everything in it —
              items, collections, and types. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Delete account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

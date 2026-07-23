import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/user";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { TypeBreakdown } from "@/components/profile/TypeBreakdown";
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard";
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";

// Reads the live session user, so opt out of static prerendering.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    // Session references a user that no longer exists — send them to sign in.
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        <ProfileHeader profile={profile} />
        <ProfileStats stats={profile.stats} />
        <TypeBreakdown breakdown={profile.typeBreakdown} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Account</h2>
          {profile.hasPassword && <ChangePasswordCard />}
          <DeleteAccountCard />
        </section>
      </div>
    </div>
  );
}

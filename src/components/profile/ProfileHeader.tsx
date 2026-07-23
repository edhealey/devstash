import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type ProfileData } from "@/lib/db/user";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatJoined(value: Date) {
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ProfileHeader({ profile }: { profile: ProfileData }) {
  const displayName = profile.name?.trim() || profile.email;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
      <Avatar size="lg" className="size-16 data-[size=lg]:size-16">
        {profile.image && (
          <AvatarImage src={profile.image} alt={displayName} />
        )}
        <AvatarFallback className="text-lg">
          {initials(profile.name, profile.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-xl font-semibold">{displayName}</h2>
        <p className="truncate text-sm text-muted-foreground">
          {profile.email}
        </p>
        <p className="text-xs text-muted-foreground">
          Joined {formatJoined(profile.createdAt)}
        </p>
      </div>
    </div>
  );
}

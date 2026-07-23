import { Files, Folder, type LucideIcon } from "lucide-react";

import { type ProfileData } from "@/lib/db/user";

export function ProfileStats({ stats }: { stats: ProfileData["stats"] }) {
  const cards: { label: string; value: number; icon: LucideIcon; color: string }[] =
    [
      { label: "Items", value: stats.items, icon: Files, color: "text-blue-400" },
      {
        label: "Collections",
        value: stats.collections,
        icon: Folder,
        color: "text-purple-400",
      },
    ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Icon className={`size-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

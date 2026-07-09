import { Folder, FolderHeart, Star, type LucideIcon } from "lucide-react";
import { Files } from "lucide-react";

import { collections, items } from "@/lib/mock-data";

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

const stats: Stat[] = [
  {
    label: "Items",
    value: items.length,
    icon: Files,
    color: "text-blue-400",
  },
  {
    label: "Collections",
    value: collections.length,
    icon: Folder,
    color: "text-purple-400",
  },
  {
    label: "Favorite Items",
    value: items.filter((item) => item.isFavorite).length,
    icon: Star,
    color: "text-yellow-400",
  },
  {
    label: "Favorite Collections",
    value: collections.filter((collection) => collection.isFavorite).length,
    icon: FolderHeart,
    color: "text-pink-400",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
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

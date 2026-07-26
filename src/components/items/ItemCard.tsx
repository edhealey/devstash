import Link from "next/link";
import { Pin, Star } from "lucide-react";

import { type ItemCardData } from "@/lib/db/items";
import { getSystemTypeStyle, typeSlug } from "@/lib/item-types";
import { cn } from "@/lib/utils";

function formatDate(value: Date) {
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Grid tile for the /items/[type] listing. Same data as the dashboard's
// ItemRow, laid out for a card grid instead of a stacked list; the left accent
// comes from the item's own type, not a collection's dominant type.
export function ItemCard({ item }: { item: ItemCardData }) {
  const { icon: Icon, iconColor, borderColor } = getSystemTypeStyle(
    item.typeName
  );

  return (
    <Link
      href={`/items/${typeSlug(item.typeName)}/${item.id}`}
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border border-l-4 border-border bg-card p-5 transition-colors hover:bg-accent/50",
        borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Icon className={cn("size-5", iconColor)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{item.title}</h3>
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(item.updatedAt)}
        </span>
      </div>

      {item.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-accent px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

import Link from "next/link";
import { File, Star } from "lucide-react";

import { getItemType, typeIcons } from "@/lib/type-icons";
import { type Collection } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-l-4 border-border bg-card p-5 transition-colors hover:bg-accent/50",
        collection.accentColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{collection.name}</h3>
            {collection.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {collection.itemCount} items
          </p>
        </div>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">
        {collection.description}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-1">
        {collection.typeIds.map((typeId) => {
          const type = getItemType(typeId);
          if (!type) return null;
          const Icon = typeIcons[type.icon] ?? File;
          return (
            <Icon
              key={typeId}
              className={cn("size-4", type.color)}
              aria-label={type.name}
            />
          );
        })}
      </div>
    </Link>
  );
}

import { getSystemTypeStyle } from "@/lib/item-types";
import { cn } from "@/lib/utils";

// Shown when a valid type has no items yet. Copy is derived from the registry
// label so a new type needs no new string here.
export function ItemsEmptyState({ typeName }: { typeName: string }) {
  const { icon: Icon, iconColor, label } = getSystemTypeStyle(typeName);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-accent">
        <Icon className={cn("size-6", iconColor)} />
      </div>
      <div>
        <p className="font-medium">No {label.toLowerCase()} yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Items you save as {label.toLowerCase()} will show up here.
        </p>
      </div>
    </div>
  );
}

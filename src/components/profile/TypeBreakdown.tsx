import { type ItemTypeSummary } from "@/lib/db/items";
import { getSystemTypeStyle } from "@/lib/item-types";
import { cn } from "@/lib/utils";

export function TypeBreakdown({
  breakdown,
}: {
  breakdown: ItemTypeSummary[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Items by type</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {breakdown.map((type) => {
          const { icon: Icon, iconColor, label } = getSystemTypeStyle(type.name);
          return (
            <div
              key={type.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Icon className={cn("size-4 shrink-0", iconColor)} />
              <span className="flex-1 truncate text-sm">{label}</span>
              <span className="text-sm font-medium text-muted-foreground">
                {type.count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

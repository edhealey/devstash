import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemsEmptyState } from "@/components/items/ItemsEmptyState";
import { Badge } from "@/components/ui/badge";
import { getItemsByType } from "@/lib/db/items";
import { getSystemTypeStyle, typeNameFromSlug } from "@/lib/item-types";
import { cn } from "@/lib/utils";

// Per-user reads, so opt out of static prerendering.
export const dynamic = "force-dynamic";

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;

  // An unrecognized slug is a 404 — never a fall-through to an unfiltered list.
  const typeName = typeNameFromSlug(slug);
  if (!typeName) {
    notFound();
  }

  // Scope every read to the signed-in user. Resolved from the session, never
  // from a client-supplied value.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/login?callbackUrl=/items/${slug}`);
  }

  const items = await getItemsByType(userId, typeName);
  const { icon: Icon, iconColor, label, isPro } = getSystemTypeStyle(typeName);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <Icon className={cn("size-6", iconColor)} />
        <h1 className="text-3xl font-bold">{label}</h1>
        {isPro && (
          <Badge
            variant="secondary"
            className="h-5 px-2 text-[10px] font-semibold tracking-wide text-muted-foreground"
          >
            PRO
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </header>

      {items.length === 0 ? (
        <ItemsEmptyState typeName={typeName} />
      ) : (
        // grid-cols-1 is explicit on purpose: an implicit auto track sizes to
        // the card's content and overflows narrow viewports, while
        // minmax(0, 1fr) caps it to the container.
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

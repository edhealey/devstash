import Link from "next/link";
import { redirect } from "next/navigation";
import { Pin } from "lucide-react";

import { auth } from "@/auth";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemRow } from "@/components/dashboard/ItemRow";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { getDashboardStats, getRecentCollections } from "@/lib/db/collections";
import { getPinnedItems, getRecentItems } from "@/lib/db/items";

// Dashboard reads live data, so opt out of static prerendering.
export const dynamic = "force-dynamic";

function SectionHeader({
  title,
  icon: Icon,
  href,
}: {
  title: string;
  icon?: typeof Pin;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  // Scope every read to the signed-in user. Resolved from the session, never
  // from a client-supplied value.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const [stats, recentCollections, pinnedItems, recentItems] =
    await Promise.all([
      getDashboardStats(userId),
      getRecentCollections(userId, 6),
      getPinnedItems(userId),
      getRecentItems(userId, 10),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6">
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Your developer knowledge hub
        </p>
      </header>

      <StatsCards stats={stats} />

      <section>
        <SectionHeader title="Collections" href="/collections" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      {pinnedItems.length > 0 && (
        <section>
          <SectionHeader title="Pinned" icon={Pin} />
          <div className="space-y-3">
            {pinnedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Recent Items" href="/items" />
        <div className="space-y-3">
          {recentItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

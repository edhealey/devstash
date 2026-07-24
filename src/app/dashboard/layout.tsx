import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/dashboard/SidebarProvider";
import { Topbar } from "@/components/dashboard/Topbar";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSidebarItemTypes } from "@/lib/db/items";

// The sidebar reads live data, so opt out of static prerendering.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy already redirects unauthenticated requests, but the sidebar
  // queries are scoped by this id — so resolve it here rather than assuming,
  // and bail out if it's somehow missing instead of falling back to any
  // default scope.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const [types, { favorites, recent }] = await Promise.all([
    getSidebarItemTypes(userId),
    getSidebarCollections(userId),
  ]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar
          user={session?.user ?? null}
          types={types}
          favoriteCollections={favorites}
          recentCollections={recent}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

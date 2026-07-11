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
  const [types, { favorites, recent }] = await Promise.all([
    getSidebarItemTypes(),
    getSidebarCollections(),
  ]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar
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

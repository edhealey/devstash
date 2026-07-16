"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, Layers, Settings, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/dashboard/SidebarProvider";
import { getSystemTypeStyle } from "@/lib/item-types";
import { type SidebarCollectionData } from "@/lib/db/collections";
import { type ItemTypeSummary } from "@/lib/db/items";
import { currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface SidebarProps {
  types: ItemTypeSummary[];
  favoriteCollections: SidebarCollectionData[];
  recentCollections: SidebarCollectionData[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SidebarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function TypeRow({ type }: { type: ItemTypeSummary }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const style = getSystemTypeStyle(type.name);
  const href = `/items/${style.label.toLowerCase()}`;
  const Icon = style.icon;
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={() => setOpenMobile(false)}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-accent",
        active && "bg-accent font-medium"
      )}
    >
      <Icon className={cn("size-4 shrink-0", style.iconColor)} />
      <span className="flex-1 truncate">{style.label}</span>
      {style.isPro && (
        <Badge
          variant="secondary"
          className="h-4 px-1.5 text-[9px] font-semibold tracking-wide text-muted-foreground"
        >
          PRO
        </Badge>
      )}
      <span className="text-xs text-muted-foreground">{type.count}</span>
    </Link>
  );
}

function CollectionRow({ collection }: { collection: SidebarCollectionData }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const href = `/collections/${collection.id}`;
  const active = pathname === href;
  const dotColor = collection.dominantType
    ? getSystemTypeStyle(collection.dominantType).dotColor
    : "bg-muted-foreground";

  return (
    <Link
      href={href}
      onClick={() => setOpenMobile(false)}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-accent",
        active && "bg-accent font-medium"
      )}
    >
      <Folder className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{collection.name}</span>
      {collection.isFavorite ? (
        <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
      ) : (
        <span
          className={cn("size-2.5 shrink-0 rounded-full", dotColor)}
          aria-hidden
        />
      )}
    </Link>
  );
}

// Shared sidebar body used by both the desktop rail and the mobile drawer.
function SidebarContent({
  types,
  favoriteCollections,
  recentCollections,
}: SidebarProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers className="size-5" />
        </div>
        <span className="text-lg font-semibold">DevStash</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <SidebarGroup label="Types">
          {types.map((type) => (
            <TypeRow key={type.name} type={type} />
          ))}
        </SidebarGroup>

        <div className="mx-3 my-1 border-t border-border" />

        <SidebarGroup label="Collections">
          {favoriteCollections.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Favorites
              </p>
              {favoriteCollections.map((collection) => (
                <CollectionRow key={collection.id} collection={collection} />
              ))}
            </>
          )}
          {recentCollections.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Recent
              </p>
              {recentCollections.map((collection) => (
                <CollectionRow key={collection.id} collection={collection} />
              ))}
            </>
          )}
          <Link
            href="/collections"
            onClick={() => setOpenMobile(false)}
            className="mt-2 flex items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            View all collections
          </Link>
        </SidebarGroup>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-3">
        <Avatar>
          {currentUser.avatarUrl && (
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
          )}
          <AvatarFallback>{initials(currentUser.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{currentUser.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {currentUser.email}
          </p>
        </div>
        <button
          type="button"
          aria-label="Settings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  types,
  favoriteCollections,
  recentCollections,
}: SidebarProps) {
  const { open, openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      {/* Desktop: collapsible inline rail. */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border md:block",
          open ? "md:w-64" : "md:hidden"
        )}
      >
        <SidebarContent
          types={types}
          favoriteCollections={favoriteCollections}
          recentCollections={recentCollections}
        />
      </aside>

      {/* Mobile: overlay drawer. */}
      <div
        role="button"
        tabIndex={-1}
        aria-hidden={!openMobile}
        onClick={() => setOpenMobile(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 md:hidden",
          openMobile ? "block" : "hidden"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border transition-transform duration-200 md:hidden",
          openMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          types={types}
          favoriteCollections={favoriteCollections}
          recentCollections={recentCollections}
        />
      </aside>
    </>
  );
}

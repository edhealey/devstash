"use client";

import {
  CalendarDays,
  Copy,
  FolderOpen,
  Pencil,
  Pin,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ItemEditForm } from "@/components/items/ItemEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { type ItemCardData, type ItemDetailPayload } from "@/lib/db/items";
import { getSystemTypeStyle } from "@/lib/item-types";
import { cn } from "@/lib/utils";

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The single body value for now: whichever field this content type stores it
// in. Per-type rendering (syntax highlighting, markdown, link previews, file
// downloads) is a later feature.
function contentValue(detail: ItemDetailPayload) {
  return detail.content ?? detail.url ?? detail.fileName ?? null;
}

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Tag;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {Icon && <Icon className="size-4" />}
      {children}
    </h3>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40" />
      </div>
    </div>
  );
}

// Item detail view. Favorite, Pin and Delete are display only for now; Copy
// needs nothing from the server, and Edit swaps the panel for ItemEditForm.
export function ItemDrawer({
  open,
  onOpenChange,
  card,
  detail,
  error,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ItemCardData | null;
  detail: ItemDetailPayload | null;
  error: string | null;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (updated: ItemDetailPayload) => void;
}) {
  if (!card) return null;

  const { icon: Icon, iconColor, label } = getSystemTypeStyle(card.typeName);
  const isFavorite = detail?.isFavorite ?? card.isFavorite;
  const isPinned = detail?.isPinned ?? card.isPinned;

  async function handleCopy() {
    const value = detail && contentValue(detail);
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // Radix warns when a dialog has no description; this one's body is a
        // detail panel, and the title already names it.
        aria-describedby={undefined}
        // Width overrides have to carry the same data-side variant as
        // SheetContent's defaults (w-3/4, sm:max-w-sm), or those more specific
        // selectors win: the panel stays narrow and code content is unreadable.
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        {editing && detail ? (
          <ItemEditForm
            detail={detail}
            onCancel={onCancelEdit}
            onSaved={onSaved}
          />
        ) : (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6 pr-14">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <Icon className={cn("size-5", iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  {/* Falls back to the card data so the title is on screen before
                  the detail fetch lands; prefers the detail once it has (it is
                  the fresher value after a save). */}
                  <SheetTitle className="text-xl font-semibold">
                    {detail?.title ?? card.title}
                  </SheetTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{label}</Badge>
                    {detail?.language && (
                      <Badge variant="outline">{detail.language}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Wraps rather than overflowing: five actions don't fit one row on a
              narrow phone. */}
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Star
                    className={cn(
                      "size-4",
                      isFavorite && "fill-yellow-400 text-yellow-400"
                    )}
                  />
                  Favorite
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  {/* No second accent color for pinned — a solid icon reads as
                  active without competing with the favorite star. */}
                  <Pin className={cn("size-4", isPinned && "fill-current")} />
                  Pin
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={handleCopy}
                  disabled={!detail || !contentValue(detail)}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>

                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={onEdit}
                    // Edit mode is seeded from the detail payload, so it can't open
                    // before the fetch resolves.
                    disabled={!detail}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete item"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : !detail ? (
                <DetailSkeleton />
              ) : (
                <>
                  {detail.description && (
                    <section className="space-y-2">
                      <SectionLabel>Description</SectionLabel>
                      <p className="text-sm">{detail.description}</p>
                    </section>
                  )}

                  {contentValue(detail) && (
                    <section className="space-y-2">
                      <SectionLabel>Content</SectionLabel>
                      <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed">
                        <code className="font-mono">
                          {contentValue(detail)}
                        </code>
                      </pre>
                    </section>
                  )}

                  {detail.tags.length > 0 && (
                    <section className="space-y-2">
                      <SectionLabel icon={Tag}>Tags</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}

                  {detail.collections.length > 0 && (
                    <section className="space-y-2">
                      <SectionLabel icon={FolderOpen}>Collections</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.collections.map((collection) => (
                          <Badge key={collection.id} variant="secondary">
                            {collection.name}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="space-y-2">
                    <SectionLabel icon={CalendarDays}>Details</SectionLabel>
                    <dl className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{formatFullDate(detail.createdAt)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Updated</dt>
                        <dd>{formatFullDate(detail.updatedAt)}</dd>
                      </div>
                    </dl>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

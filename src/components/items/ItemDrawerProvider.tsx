"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { ItemDrawer } from "@/components/items/ItemDrawer";
import { type ItemCardData, type ItemDetailPayload } from "@/lib/db/items";

interface ItemDrawerContextValue {
  openItem: (item: ItemCardData) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

export function useItemDrawer() {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used within an ItemDrawerProvider");
  }
  return context;
}

// Owns the drawer's open state and the on-click detail fetch, so the pages that
// render item cards can stay server components. Lives in the (dashboard)
// layout, which means one drawer instance for every section that lists items.
export function ItemDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // The card data already on screen, shown in the header while the rest loads.
  const [card, setCard] = useState<ItemCardData | null>(null);
  const [detail, setDetail] = useState<ItemDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Reset whenever the drawer opens or closes, so a half-finished edit can't
  // carry over to the next item.
  const [editing, setEditing] = useState(false);
  // Aborting keeps a slow response for a card the user has since closed (or
  // replaced with another) from landing in the drawer.
  const requestRef = useRef<AbortController | null>(null);

  const openItem = useCallback((item: ItemCardData) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setCard(item);
    setDetail(null);
    setError(null);
    setEditing(false);
    setOpen(true);

    async function load() {
      try {
        const response = await fetch(`/api/items/${item.id}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok || !body?.success) {
          setError(body?.error ?? "Could not load this item.");
          return;
        }

        setDetail(body.data as ItemDetailPayload);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("Could not load this item.");
      }
    }

    void load();
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      requestRef.current?.abort();
      setEditing(false);
    }
    setOpen(next);
  }, []);

  // The action returns the refreshed detail, so the drawer re-renders from the
  // response instead of refetching.
  const handleSaved = useCallback((updated: ItemDetailPayload) => {
    setDetail(updated);
    setCard((current) =>
      current
        ? {
            ...current,
            title: updated.title,
            description: updated.description,
            tags: updated.tags,
          }
        : current
    );
    setEditing(false);
  }, []);

  return (
    <ItemDrawerContext.Provider value={{ openItem }}>
      {children}
      <ItemDrawer
        open={open}
        onOpenChange={handleOpenChange}
        card={card}
        detail={detail}
        error={error}
        editing={editing}
        onEdit={() => setEditing(true)}
        onCancelEdit={() => setEditing(false)}
        onSaved={handleSaved}
      />
    </ItemDrawerContext.Provider>
  );
}

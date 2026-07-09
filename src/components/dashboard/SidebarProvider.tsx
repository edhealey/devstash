"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarContextValue {
  isMobile: boolean;
  // Desktop: sidebar collapsed/expanded inline.
  open: boolean;
  // Mobile: drawer visibility.
  openMobile: boolean;
  toggle: () => void;
  setOpenMobile: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  const toggle = useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
    } else {
      setOpen((value) => !value);
    }
  }, [isMobile]);

  return (
    <SidebarContext.Provider
      value={{ isMobile, open, openMobile, toggle, setOpenMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

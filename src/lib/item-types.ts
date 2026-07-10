// Visual styling for the seven system item types, keyed by the type name
// stored in the database (see prisma/seed.ts). Uses Tailwind utility classes
// so components stay free of inline styles.

import {
  Code,
  File,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export interface SystemTypeStyle {
  icon: LucideIcon;
  // Tailwind text color for the type icon
  iconColor: string;
  // Tailwind left-border color for a collection card accent
  borderColor: string;
}

export const SYSTEM_TYPE_STYLES: Record<string, SystemTypeStyle> = {
  snippet: { icon: Code, iconColor: "text-blue-400", borderColor: "border-l-blue-500" },
  prompt: { icon: Sparkles, iconColor: "text-purple-400", borderColor: "border-l-purple-500" },
  command: { icon: Terminal, iconColor: "text-orange-400", borderColor: "border-l-orange-500" },
  note: { icon: StickyNote, iconColor: "text-yellow-400", borderColor: "border-l-yellow-500" },
  file: { icon: File, iconColor: "text-neutral-300", borderColor: "border-l-neutral-600" },
  image: { icon: Image, iconColor: "text-pink-400", borderColor: "border-l-pink-500" },
  link: { icon: Link, iconColor: "text-green-400", borderColor: "border-l-green-500" },
};

// Canonical ordering for rendering type icons consistently across cards.
export const SYSTEM_TYPE_ORDER = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
] as const;

// Sort index for a type name; unknown names sort last.
export function systemTypeOrderIndex(name: string): number {
  const index = (SYSTEM_TYPE_ORDER as readonly string[]).indexOf(name);
  return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
}

const FALLBACK_STYLE: SystemTypeStyle = {
  icon: File,
  iconColor: "text-muted-foreground",
  borderColor: "border-l-border",
};

export function getSystemTypeStyle(name: string): SystemTypeStyle {
  return SYSTEM_TYPE_STYLES[name] ?? FALLBACK_STYLE;
}

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

// Type-specific fields the item edit form shows. Title, description and tags
// are editable for every type and so aren't listed here.
export type EditableField = "content" | "language" | "url";

export interface SystemTypeStyle {
  // Plural display label used in the sidebar (e.g. "Snippets")
  label: string;
  // URL segment for the type's list page (e.g. "snippets" → /items/snippets)
  slug: string;
  icon: LucideIcon;
  // Tailwind text color for the type icon
  iconColor: string;
  // Tailwind left-border color for a collection card accent
  borderColor: string;
  // Tailwind background color for a filled dot / circle
  dotColor: string;
  // Pro-only feature (File and Image types)
  isPro?: boolean;
  // Which type-specific fields the edit form offers for this type. Keeping it
  // here rather than in the form means a new type declares its own fields.
  editFields: readonly EditableField[];
}

// One line per type, kept as a readable table — File and Image have no
// type-specific editable fields until file replacement ships.
// prettier-ignore
export const SYSTEM_TYPE_STYLES: Record<string, SystemTypeStyle> = {
  snippet: { label: "Snippets", slug: "snippets", icon: Code, iconColor: "text-blue-400", borderColor: "border-l-blue-500", dotColor: "bg-blue-500", editFields: ["content", "language"] },
  prompt: { label: "Prompts", slug: "prompts", icon: Sparkles, iconColor: "text-purple-400", borderColor: "border-l-purple-500", dotColor: "bg-purple-500", editFields: ["content"] },
  command: { label: "Commands", slug: "commands", icon: Terminal, iconColor: "text-orange-400", borderColor: "border-l-orange-500", dotColor: "bg-orange-500", editFields: ["content", "language"] },
  note: { label: "Notes", slug: "notes", icon: StickyNote, iconColor: "text-yellow-400", borderColor: "border-l-yellow-500", dotColor: "bg-yellow-500", editFields: ["content"] },
  file: { label: "Files", slug: "files", icon: File, iconColor: "text-neutral-300", borderColor: "border-l-neutral-600", dotColor: "bg-neutral-600", isPro: true, editFields: [] },
  image: { label: "Images", slug: "images", icon: Image, iconColor: "text-pink-400", borderColor: "border-l-pink-500", dotColor: "bg-pink-500", isPro: true, editFields: [] },
  link: { label: "Links", slug: "links", icon: Link, iconColor: "text-green-400", borderColor: "border-l-green-500", dotColor: "bg-green-500", editFields: ["url"] },
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
  label: "Items",
  slug: "items",
  icon: File,
  iconColor: "text-muted-foreground",
  borderColor: "border-l-border",
  dotColor: "bg-muted-foreground",
  editFields: [],
};

export function getSystemTypeStyle(name: string): SystemTypeStyle {
  return SYSTEM_TYPE_STYLES[name] ?? FALLBACK_STYLE;
}

// URL segment for a type's list page: "snippet" → "snippets".
export function typeSlug(name: string): string {
  return getSystemTypeStyle(name).slug;
}

// Reverse of typeSlug: "snippets" → "snippet". Returns null for an unknown
// slug so callers can 404 rather than fall through to an unfiltered list.
export function typeNameFromSlug(slug: string): string | null {
  const normalized = slug.toLowerCase();
  return (
    SYSTEM_TYPE_ORDER.find(
      (name) => SYSTEM_TYPE_STYLES[name].slug === normalized
    ) ?? null
  );
}

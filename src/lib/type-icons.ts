// Maps the icon names stored in mock data to lucide-react components.
// Shared by dashboard components that render item-type icons.

import {
  Code2,
  File,
  FileText,
  Image,
  Link2,
  Sparkles,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

import { itemTypes, type ItemType } from "@/lib/mock-data";

export const typeIcons: Record<string, LucideIcon> = {
  Code2,
  Sparkles,
  TerminalSquare,
  FileText,
  File,
  Image,
  Link2,
};

const typesById = new Map(itemTypes.map((type) => [type.id, type]));

export function getItemType(typeId: string): ItemType | undefined {
  return typesById.get(typeId);
}

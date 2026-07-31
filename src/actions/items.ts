"use server";

import { z } from "zod";

import { auth } from "@/auth";
import {
  toItemDetailPayload,
  updateItem,
  type ItemDetailPayload,
} from "@/lib/db/items";

export interface ItemActionResult {
  success: boolean;
  data?: ItemDetailPayload;
  error?: string;
}

// An optional single-line field: whitespace-only and missing both mean "clear
// it", so the column ends up null rather than holding an empty string.
const optionalText = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length === 0 ? null : trimmed;
  });

// Same, but preserves the value verbatim once it has any content — trimming
// would eat the leading indentation and trailing newline of a code block.
const optionalBody = z
  .string()
  .nullish()
  .transform((value) => (value?.trim() ? value : null));

// Restricted to http(s) on purpose: a bare `z.url()` accepts `javascript:` and
// `data:` too, and a link's URL is stored data that will outlive the current
// decision to render it as text rather than an href.
const optionalUrl = optionalText.refine(
  (value) =>
    value === null || z.url({ protocol: /^https?$/ }).safeParse(value).success,
  { message: "Enter a valid URL starting with http:// or https://." }
);

const updateItemSchema = z.object({
  title: z
    .string({ error: "Title is required." })
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  description: optionalText,
  content: optionalBody,
  url: optionalUrl,
  language: optionalText,
  // The complete replacement set for the item. Blank entries are dropped so a
  // trailing comma in the input doesn't create an empty tag, and duplicates are
  // collapsed since tags are unique by name.
  tags: z
    .array(z.string())
    .default([])
    .transform((values) => [
      ...new Set(values.map((value) => value.trim()).filter(Boolean)),
    ]),
});

export type UpdateItemInput = z.input<typeof updateItemSchema>;

// Saves an edit from the item drawer. The user comes from the session, never
// from the caller, and ownership is enforced in the query's `where` clause, so
// another account's item is indistinguishable from one that doesn't exist.
export async function updateItemAction(
  itemId: string,
  input: UpdateItemInput
): Promise<ItemActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be signed in." };
  }

  if (typeof itemId !== "string" || itemId.length === 0) {
    return { success: false, error: "Invalid request." };
  }

  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    // One message is all the drawer shows; the first issue is the actionable
    // one for a form this small.
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request.",
    };
  }

  try {
    const item = await updateItem(userId, itemId, parsed.data);

    if (!item) {
      return { success: false, error: "Item not found." };
    }

    return { success: true, data: toItemDetailPayload(item) };
  } catch (error) {
    console.error("[items] Failed to update item:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

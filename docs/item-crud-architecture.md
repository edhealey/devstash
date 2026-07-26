# Item CRUD Architecture

> A design for one CRUD system that serves all seven item types — one action file for
> mutations, `lib/db` for reads, one dynamic route, and shared components that adapt by type.
>
> _Researched: 2026-07-24. This is a **design document**, not a record of existing code — none of
> the item CRUD exists yet. Sources: `context/project-overview.md`, `context/coding-standards.md`,
> [docs/item-types.md](./item-types.md), `prisma/schema.prisma`, `src/lib/item-types.ts`, and the
> existing auth/profile/dashboard code that establishes the patterns this design follows._

---

## Table of Contents

- [Principles](#principles)
- [File structure](#file-structure)
- [Routing: how `/items/[type]` works](#routing-how-itemstype-works)
- [The type registry: where type knowledge lives](#the-type-registry-where-type-knowledge-lives)
- [Mutations: `src/actions/items.ts`](#mutations-srcactionsitemsts)
- [Queries: `src/lib/db/items.ts`](#queries-srclibdbitemsts)
- [Components](#components)
- [Validation](#validation)
- [Cache revalidation](#cache-revalidation)
- [Security checklist](#security-checklist)
- [Prerequisites and open decisions](#prerequisites-and-open-decisions)
- [Suggested build order](#suggested-build-order)

---

## Principles

Four rules keep seven types from becoming seven code paths:

1. **Type is data, not control flow.** A type is a row in `item_types` joined by `name`. Adding a
   type should mean adding a registry entry, not adding a branch.
2. **Actions are type-agnostic.** `createItem` doesn't know what a snippet is. It knows an item has
   a type, that the type implies a `contentType`, and that `contentType` implies which payload
   column to write. All three come from the registry.
3. **Components adapt; actions don't.** Every visible difference — a code editor vs. a URL input, a
   syntax-highlighted block vs. an image preview — is a component-level switch on `contentType`.
4. **The user id comes from the session, never the client.** Already the standing convention in
   [src/lib/db/items.ts](../src/lib/db/items.ts) and [src/actions/profile.ts](../src/actions/profile.ts);
   item CRUD extends it with ownership-scoped writes.

---

## File structure

New files marked ✨; existing files that need extending marked ✏️.

```
src/
├── actions/
│   └── items.ts                    ✨ ALL item mutations (create/update/delete/toggles/collections)
├── lib/
│   ├── item-types.ts               ✏️ registry: + slug, contentType, form/display config
│   ├── validation/
│   │   └── items.ts                ✨ Zod schemas for item input
│   └── db/
│       └── items.ts                ✏️ + getItemsByType, getItemById, getAllItems, counts
├── app/
│   └── (dashboard)/                ✏️ route group — move the existing shell here
│       ├── layout.tsx              ✏️ moved from app/dashboard/layout.tsx (Sidebar + Topbar)
│       ├── dashboard/page.tsx      ✏️ moved, unchanged
│       ├── items/
│       │   ├── page.tsx            ✨ all items
│       │   ├── new/page.tsx        ✨ create (type chosen in the form)
│       │   └── [type]/
│       │       ├── page.tsx        ✨ list filtered by type
│       │       ├── new/page.tsx    ✨ create with the type preselected
│       │       └── [id]/
│       │           ├── page.tsx    ✨ detail
│       │           └── edit/page.tsx ✨ edit
│       └── collections/            (out of scope — same shape)
└── components/
    └── items/
        ├── ItemsHeader.tsx         ✨ title + count + New button, type-aware
        ├── ItemList.tsx            ✨ maps rows, renders EmptyState when empty
        ├── ItemRow.tsx             ✏️ move from components/dashboard/, add href fix
        ├── ItemEmptyState.tsx      ✨ per-type copy from the registry
        ├── ItemForm.tsx            ✨ client; shared shell for create + edit
        ├── ItemContentFields.tsx   ✨ client; switches on contentType (the ONE form switch)
        ├── ItemTypePicker.tsx      ✨ client; type select for the create form
        ├── ItemDetail.tsx          ✨ server; header + metadata + content view
        ├── ItemContentView.tsx     ✨ server; switches on contentType (the ONE display switch)
        ├── ItemActions.tsx         ✨ client; favorite / pin / copy / edit / delete
        └── DeleteItemDialog.tsx    ✨ client; alert-dialog confirm → deleteItemAction
```

Two structural notes:

- **`ItemRow` moves out of `components/dashboard/`.** It's already used by the dashboard and will
  be used by every list page; `components/items/` is its home per the file-organization standard
  (`src/components/[feature]/`).
- **The `(dashboard)` route group is a prerequisite, not a nicety.** The Sidebar + Topbar shell
  currently lives in [src/app/dashboard/layout.tsx](../src/app/dashboard/layout.tsx), so it only
  wraps `/dashboard`. `/items/*` needs the same chrome. A route group gives all three sections one
  layout **without changing any URL** — `(dashboard)` is not a path segment. This is also exactly
  the structure `context/project-overview.md` proposes.

---

## Routing: how `/items/[type]` works

### The route table

| URL                             | File                                      | Renders                                  |
| ------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `/items`                        | `items/page.tsx`                          | All items, all types                     |
| `/items/snippets`               | `items/[type]/page.tsx`                   | Items of one type                        |
| `/items/snippets/new`           | `items/[type]/new/page.tsx`               | Create form, type preselected            |
| `/items/snippets/clx123`        | `items/[type]/[id]/page.tsx`              | Item detail                              |
| `/items/snippets/clx123/edit`   | `items/[type]/[id]/edit/page.tsx`         | Edit form                                |
| `/items/new`                    | `items/new/page.tsx`                      | Create form, type chosen in the form     |

### ⚠️ The conflict this resolves

Today the sidebar links to `/items/snippets`
([Sidebar.tsx:72](../src/components/dashboard/Sidebar.tsx#L72)) while `ItemRow` links to
`/items/{id}` ([ItemRow.tsx:22](../src/components/dashboard/ItemRow.tsx#L22)). Those cannot both
exist: Next.js does not allow two dynamic segments (`[type]` and `[id]`) at the same level — it's a
build error, not a runtime ambiguity.

**Resolution: nest the detail under the type** — `/items/[type]/[id]`. Detail URLs then read well
(`/items/snippets/clx123`), the breadcrumb is implicit, and the list page's filter context survives
the click. The cost is that `ItemRow` needs the type slug to build its href, which it already has
(`item.typeName`), plus a redirect if the slug in the URL doesn't match the item's real type.

> The alternative — keeping `/items/[id]` and moving lists to `/types/[type]` — was rejected because
> the sidebar, the spec's route table, and `docs/item-types.md` all already commit to `/items/snippets`.

### Slug ↔ name resolution

The URL uses the **plural label** (`snippets`); the DB uses the **singular name** (`snippet`). The
sidebar currently derives the slug ad hoc with `style.label.toLowerCase()`. Promote that to explicit
registry fields and a lookup:

```ts
// src/lib/item-types.ts
export function typeNameFromSlug(slug: string): string | null;  // "snippets" → "snippet"
export function typeSlug(name: string): string;                 // "snippet"  → "snippets"
```

`typeNameFromSlug` returning `null` is the 404 signal — an unknown slug must `notFound()`, never
fall through to an unfiltered list.

### Page shape

Every list/detail page follows the pattern the dashboard already uses: `force-dynamic`, resolve the
session, fetch directly with a `lib/db` helper, render.

```tsx
// src/app/(dashboard)/items/[type]/page.tsx
export const dynamic = "force-dynamic";

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;              // Next 16: params is a Promise
  const typeName = typeNameFromSlug(slug);
  if (!typeName) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect(`/login?callbackUrl=/items/${slug}`);

  const items = await getItemsByType(userId, typeName);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <ItemsHeader typeName={typeName} count={items.length} />
      <ItemList items={items} typeName={typeName} />
    </div>
  );
}
```

**Static params.** Because there are exactly seven system types, `generateStaticParams` could
enumerate the slugs — but the pages are `force-dynamic` per-user reads, so it buys nothing. Skip it.

---

## The type registry: where type knowledge lives

Everything type-specific concentrates in [src/lib/item-types.ts](../src/lib/item-types.ts), which
today holds only visual styling. Extend `SystemTypeStyle` with routing, storage, and form/display
configuration so that **adding a type is one object literal**:

```ts
export interface SystemTypeConfig {
  // --- existing visual fields ---
  label: string;              // "Snippets"
  icon: LucideIcon;
  iconColor: string;
  borderColor: string;
  dotColor: string;
  isPro?: boolean;

  // --- new ---
  slug: string;               // "snippets" — URL segment
  singular: string;           // "Snippet"  — headings, buttons ("New Snippet")
  contentType: ContentType;   // TEXT | FILE | URL  (moved out of prisma/seed.ts)
  hasLanguage: boolean;       // show the language picker (snippet, command)
  contentLabel: string;       // "Code" | "Prompt" | "Command" | "Note"
  contentPlaceholder: string;
  emptyState: string;         // "No snippets yet. Save your first piece of code."
  monospace: boolean;         // render content in a mono font (snippet, command)
}
```

Two things move *into* this file:

1. **`CONTENT_TYPE_BY_ITEM_TYPE`**, currently stranded in
   [prisma/seed.ts:321-329](../prisma/seed.ts#L321-L329). The actions need it and must not
   re-declare it — a drift between seed and app would produce items whose `contentType` disagrees
   with their type. One export, two consumers.
2. **The slug derivation**, currently inline in the sidebar.

Per [docs/item-types.md](./item-types.md), the DB's `icon`/`color` columns stay unread — the registry
is the source of truth for rendering, keyed by `name`.

### What lives where — the rule

| Concern                                                    | Lives in                        |
| ---------------------------------------------------------- | ------------------------------- |
| Which columns a type populates                              | Registry (`contentType`)        |
| Which form fields render, with what labels/placeholders     | `ItemContentFields` + registry  |
| How content displays (code block / markdown / link / image) | `ItemContentView`               |
| Icon, color, label, slug                                    | Registry                        |
| Ownership, auth, persistence, validation                    | `actions/items.ts` — **no type branching beyond `contentType`** |

If you find yourself writing `if (typeName === "snippet")` in an action, the logic belongs in the
registry or a component.

---

## Mutations: `src/actions/items.ts`

One file, `"use server"`, six exported actions. All return the project's standard shape (extending
`ActionResult` from [src/actions/profile.ts](../src/actions/profile.ts#L10-L13)):

```ts
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
```

| Action                    | Signature                                              | Notes                                      |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `createItemAction`        | `(input: CreateItemInput) => ActionResult<{ id, slug }>` | Returns id + slug so the client can navigate |
| `updateItemAction`        | `(id, input: UpdateItemInput) => ActionResult`          | Type is immutable after create              |
| `deleteItemAction`        | `(id) => ActionResult`                                  | Hard delete; cascades the join rows          |
| `toggleItemFavoriteAction`| `(id) => ActionResult<{ isFavorite: boolean }>`         | Reads-then-flips inside the ownership scope  |
| `toggleItemPinAction`     | `(id) => ActionResult<{ isPinned: boolean }>`           | Same                                         |
| `setItemCollectionsAction`| `(id, collectionIds: string[]) => ActionResult`         | Replaces membership; verifies each collection is the user's |

### The canonical create

```ts
"use server";

export async function createItemAction(
  input: CreateItemInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be signed in." };

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  try {
    // 1. Resolve the type — and prove the user is allowed to use it.
    //    System types (userId null) or the user's own custom types only.
    const itemType = await prisma.itemType.findFirst({
      where: {
        id: parsed.data.itemTypeId,
        OR: [{ userId: null }, { userId }],
      },
      select: { id: true, name: true },
    });
    if (!itemType) return { success: false, error: "Unknown item type." };

    // 2. contentType is DERIVED, never accepted from the client.
    const contentType = contentTypeForItemType(itemType.name);

    // 3. Write only the columns this contentType owns.
    const item = await prisma.item.create({
      data: {
        userId,
        itemTypeId: itemType.id,
        contentType,
        title: parsed.data.title,
        description: parsed.data.description || null,
        ...payloadFor(contentType, parsed.data),   // content+language | url | file fields
        tags: connectOrCreateTags(parsed.data.tags),
        collections: parsed.data.collectionIds?.length
          ? { create: parsed.data.collectionIds.map((collectionId) => ({ collectionId })) }
          : undefined,
      },
      select: { id: true },
    });

    revalidateItemPaths(itemType.name);
    return { success: true, data: { id: item.id, slug: typeSlug(itemType.name) } };
  } catch (error) {
    console.error("[items] Failed to create item:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
```

`payloadFor` is the only place `contentType` fans out, and it's three cases:

```ts
function payloadFor(contentType: ContentType, input: ItemInput) {
  switch (contentType) {
    case "TEXT": return { content: input.content ?? "", language: input.language || null };
    case "URL":  return { url: input.url };
    case "FILE": return { fileUrl: input.fileUrl, fileName: input.fileName, fileSize: input.fileSize };
  }
}
```

### Ownership: scope the write, don't check-then-write

Never `prisma.item.update({ where: { id } })` — a cuid is guessable enough to matter and
check-then-write is a race. Use the ownership predicate as part of the write and inspect the count:

```ts
const { count } = await prisma.item.updateMany({
  where: { id, userId },          // ← ownership is part of the WHERE
  data: { ... },
});
if (count === 0) return { success: false, error: "Item not found." };
```

One round trip, no TOCTOU window, and a not-found and a not-yours are indistinguishable to the
caller — which is what you want.

`deleteItemAction` uses `deleteMany` for the same reason. `setItemCollectionsAction` additionally
verifies the target collections belong to the caller (`collection.count({ where: { id: { in }, userId } })
=== collectionIds.length`) before writing join rows — otherwise a user could file their item into a
stranger's collection.

### What actions deliberately do NOT do

- **No type-specific validation branches** beyond the `contentType` switch. "A snippet should have a
  language" is a form affordance, not a persistence rule.
- **No redirects.** Actions return `{ success, data }`; the client component navigates with
  `useRouter`. This matches [ChangePasswordCard](../src/components/profile/ChangePasswordCard.tsx)
  and keeps error rendering inline. (`deleteAccountAction` redirects, but only because it also
  destroys the session.)
- **No `contentType` from the client.** It is always derived from the resolved `ItemType` row.

---

## Queries: `src/lib/db/items.ts`

Extend the existing file, preserving its stated convention — *every helper takes `userId` as a
required parameter, never a default*:

```ts
// Already there
getPinnedItems(userId)
getRecentItems(userId, limit = 10)
getSidebarItemTypes(userId)

// To add
getAllItems(userId, opts?: ItemListOptions): Promise<ItemCardData[]>
getItemsByType(userId, typeName: string, opts?: ItemListOptions): Promise<ItemCardData[]>
getItemById(userId, id: string): Promise<ItemDetailData | null>
countItems(userId): Promise<number>                 // free-tier limit check
```

```ts
export interface ItemListOptions {
  search?: string;       // title / description / content contains, mode: "insensitive"
  collectionId?: string;
  favoritesOnly?: boolean;
  sort?: "recent" | "created" | "title";
  take?: number;
  skip?: number;
}
```

`getItemById` needs a wider select than `itemSelect` — it returns the payload columns (`content`,
`language`, `url`, `fileUrl`, `fileName`, `fileSize`), `contentType`, `createdAt`, and the item's
collection memberships (the spec's "view an item's collection memberships"). Keep it as a second
named select constant next to `itemSelect` rather than widening the list select, so list pages don't
drag `@db.Text` content over the wire for ten rows.

Server components call these **directly** — no API route, no fetch. API routes stay reserved for the
cases `context/coding-standards.md` enumerates (webhooks, upload progress, external clients), which
means file/image upload will get one later.

**Two indexing notes** carried over from [docs/item-types.md](./item-types.md): all ordering is by
`updatedAt` while the index is on `createdAt`, and per-type lists will filter `userId + itemTypeId`
and sort by `updatedAt`. A composite `@@index([userId, updatedAt])` is the migration to make when
list volume justifies it — not now, at 18 rows.

---

## Components

### Responsibilities

| Component            | Kind   | Owns                                                                                             |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `ItemsHeader`        | Server | Type icon + plural title + count + "New {Singular}" link. All strings from the registry.          |
| `ItemList`           | Server | Maps `ItemCardData[]` → `ItemRow`; renders `ItemEmptyState` at zero. No fetching, no type logic.  |
| `ItemRow`            | Server | One row: type icon, title, pin/star markers, description, tags, date. Builds `/items/{slug}/{id}`. |
| `ItemEmptyState`     | Server | Registry `emptyState` copy + a create CTA.                                                        |
| `ItemForm`           | Client | The shared shell — title, description, tags, collection picker, submit/cancel, pending state, inline errors. Calls create **or** update depending on whether it received an item. |
| `ItemContentFields`  | Client | **The single form-side type switch.** TEXT → textarea (+ language select when `hasLanguage`); URL → url input; FILE → upload control. |
| `ItemTypePicker`     | Client | Type selection on create only; disabled/absent when the route preselects a type.                  |
| `ItemDetail`         | Server | Detail layout: header, type badge, dates, collection memberships, `ItemContentView`, `ItemActions`. |
| `ItemContentView`    | Server | **The single display-side type switch.** TEXT → code block (mono, `language`) or markdown for notes; URL → clickable link card; FILE → download row; IMAGE → `<img>` preview. |
| `ItemActions`        | Client | Favorite, pin, copy-to-clipboard (TEXT only), edit link, delete trigger. Optimistic via `useOptimistic`, reconciled by the action result. |
| `DeleteItemDialog`   | Client | `alert-dialog` confirm → `deleteItemAction` → toast → `router.push` back to the list.              |

### The two switches, in full

This is the whole of the type-specific surface area. Everything else reads from the registry.

```tsx
// ItemContentFields.tsx — form side
switch (config.contentType) {
  case "TEXT":
    return (
      <>
        <Textarea name="content" label={config.contentLabel}
                  placeholder={config.contentPlaceholder}
                  className={config.monospace ? "font-mono" : undefined} />
        {config.hasLanguage && <LanguageSelect name="language" defaultValue={item?.language} />}
      </>
    );
  case "URL":
    return <Input name="url" type="url" label="URL" placeholder="https://…" required />;
  case "FILE":
    return <FileUploadField accept={typeName === "image" ? "image/*" : undefined} />;
}
```

```tsx
// ItemContentView.tsx — display side
switch (item.contentType) {
  case "TEXT":
    return typeName === "note"
      ? <MarkdownView content={item.content} />
      : <CodeBlock content={item.content} language={item.language} />;
  case "URL":
    return <LinkCard url={item.url} />;
  case "FILE":
    return typeName === "image"
      ? <ImagePreview src={item.fileUrl} alt={item.title} />
      : <FileDownload url={item.fileUrl} name={item.fileName} size={item.fileSize} />;
}
```

Note the two places where `contentType` alone is insufficient and the **type name** decides:
note-vs-code rendering, and image-vs-file preview. Those are the only two, and both are display
concerns — neither reaches the actions.

### Create/edit surface

The spec's UI guidelines call for a slide-in drawer for item editing (see
`context/screenshots/dashboard-ui-drawer.png`). **Ship dedicated routes first** — `/items/[type]/new`
and `/items/[type]/[id]/edit` — because they're shareable, server-rendered, and need no new
primitives. `ItemForm` is a self-contained client component that takes `{ typeName, item?,
collections }` and returns nothing to its parent, so wrapping it in a `Sheet` later is a
change to the caller, not to the form. Don't build both at once.

### shadcn components not yet installed

`src/components/ui/` currently has only `alert-dialog`, `avatar`, `badge`, `button`, `input`, and
`sonner`. Item CRUD needs at least:

```bash
npx shadcn add textarea select label dropdown-menu sheet
```

(`sheet` only if/when the drawer lands; `dropdown-menu` for the row overflow menu.)

---

## Validation

`context/coding-standards.md` says "Validate all inputs with Zod" — **but Zod is not a dependency**
(confirmed against `package.json`). Every existing entry point validates by hand: the register and
reset-password routes, and `changePasswordAction`. The email-verification feature already flagged
this gap.

**Recommendation: install Zod now**, before item CRUD adds six more hand-validated entry points.
Schemas go in `src/lib/validation/items.ts`:

```ts
export const itemBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  collectionIds: z.array(z.string().cuid()).max(50).default([]),
});

export const createItemSchema = itemBaseSchema.extend({
  itemTypeId: z.string().cuid(),
  content: z.string().max(100_000).optional(),
  language: z.string().max(50).optional(),
  url: z.string().url().max(2048).optional(),
});
```

The per-`contentType` requirement ("a link must have a `url`") is enforced **after** the type is
resolved server-side, since the schema can't know the contentType from `itemTypeId` alone — a small
`assertPayloadFor(contentType, input)` next to `payloadFor`. This is the invariant
[docs/item-types.md](./item-types.md) notes the schema itself can't express: every payload column is
nullable.

If Zod is rejected, the fallback is the existing manual style — but then the validation still belongs
in `src/lib/validation/items.ts` as plain functions, not inlined in each action.

---

## Cache revalidation

Nothing in the codebase calls `revalidatePath` today — the app has been read-only. Every mutating
action must, or the `force-dynamic` pages will still serve the router cache on client-side
navigation.

```ts
function revalidateItemPaths(typeName: string, id?: string) {
  revalidatePath("/dashboard");                    // stats, pinned, recent
  revalidatePath("/items");
  revalidatePath(`/items/${typeSlug(typeName)}`);
  if (id) revalidatePath(`/items/${typeSlug(typeName)}/${id}`);
  revalidatePath("/profile");                      // type breakdown + counts
}
```

The sidebar counts live in the `(dashboard)` layout, so a layout-level revalidation is implied by
each of these path calls. Collection membership changes additionally need
`revalidatePath("/collections")`.

---

## Security checklist

Every action, without exception:

1. `const userId = (await auth())?.user?.id` — bail with a generic error if absent. Never accept a
   user id in the payload.
2. Writes are scoped: `updateMany`/`deleteMany` with `where: { id, userId }`, then check `count`.
3. `itemTypeId` is validated against `{ OR: [{ userId: null }, { userId }] }` — a system type or the
   caller's own. Without this, a user can attach items to another user's custom type.
4. `collectionIds` are verified to belong to the caller before join rows are written.
5. `contentType` is derived server-side from the resolved type. Never trusted from input.
6. Not-found and not-yours produce the **same** message ("Item not found.") — no existence oracle.
7. `try/catch` around DB work; log server-side, return a generic message to the client
   (the `[items]`-prefixed `console.error` convention from `profile.ts`).
8. Free-tier limits (50 items / 3 collections) are enforced in `createItemAction` via `countItems`,
   not in the UI. Deferred per spec — but the enforcement point is here when it lands.

---

## Prerequisites and open decisions

Things that must be settled or built before item CRUD compiles cleanly:

| # | Item | Why |
| - | ---- | --- |
| 1 | **Route group `(dashboard)`** | `/items/*` needs the Sidebar/Topbar shell that currently only wraps `/dashboard`. URLs don't change. |
| 2 | **`/items/[type]` + `/items/[type]/[id]`** | Two sibling dynamic segments are a build error; the nesting must be decided before either page exists. |
| 3 | **Proxy protection** | [src/proxy.ts:10,31](../src/proxy.ts#L10-L31) covers only `/dashboard` and `/profile`. Add `/items` and `/collections` to both `PROTECTED_PREFIXES` and `config.matcher`. |
| 4 | **Zod** | Not installed, though the standards mandate it. Decide before writing six actions. |
| 5 | **`CONTENT_TYPE_BY_ITEM_TYPE` export** | Currently only in `prisma/seed.ts`; the actions need it and must not duplicate it. |
| 6 | **Slug helpers** | The sidebar's `label.toLowerCase()` becomes a shared `typeSlug`/`typeNameFromSlug` pair. |
| 7 | **Topbar "New Item"** | Display-only today ([Topbar.tsx:42-45](../src/components/dashboard/Topbar.tsx#L42-L45)); wire to `/items/new`. |
| 8 | **Tag input UX** | `Tag.name` is globally unique and shared across users — `connectOrCreate` is correct, but tags are therefore a global namespace. Worth a conscious decision; no seeded item has tags, so this path is entirely untested. |
| 9 | **File/Image upload** | `FILE` types need Cloudflare R2 (`src/lib/r2.ts` doesn't exist) and an API route for upload progress. Design the TEXT and URL paths so FILE slots in — build it separately. |

---

## Suggested build order

Each step ends buildable and verifiable in the browser, per the project workflow.

1. **Foundation** — route group move, registry extension (slug/contentType/config), slug helpers,
   proxy prefixes. No behavior change; the sidebar links stop 404-ing on shell.
2. **Read path** — `getAllItems` / `getItemsByType` / `getItemById`, the list and detail pages,
   `ItemsHeader` / `ItemList` / `ItemEmptyState` / `ItemDetail` / `ItemContentView`. Fully
   exercisable against the 18 seeded items.
3. **Create** — Zod, `createItemAction`, `ItemForm` + `ItemContentFields` + `ItemTypePicker`,
   `/items/[type]/new`, revalidation. Covers TEXT and URL; leaves FILE stubbed.
4. **Update + delete** — `updateItemAction` / `deleteItemAction`, the edit route,
   `DeleteItemDialog`.
5. **Toggles** — favorite / pin / copy via `ItemActions`, optimistic.
6. **Collections membership** — `setItemCollectionsAction` + the picker (pairs naturally with
   collections CRUD).
7. **Later** — search (`ItemListOptions.search`), R2 upload for FILE/IMAGE, free-tier limits.

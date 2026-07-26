# Item Types

> Reference for the seven system item types in DevStash — their identity, styling,
> purpose, and the `Item` fields each one actually uses.
>
> _Researched: 2026-07-24. Sources: `context/project-overview.md`, `prisma/schema.prisma`,
> `prisma/seed.ts`, `src/lib/item-types.ts`, the dashboard components, and a live read of the
> Neon `development` branch._

---

## Table of Contents

- [How a type is defined](#how-a-type-is-defined)
- [The seven system types](#the-seven-system-types)
- [Per-type detail](#per-type-detail)
- [Content-type classification: TEXT vs FILE vs URL](#content-type-classification-text-vs-file-vs-url)
- [Shared properties](#shared-properties)
- [Display differences](#display-differences)
- [Live data snapshot](#live-data-snapshot)
- [Gaps and inconsistencies](#gaps-and-inconsistencies)

---

## How a type is defined

A type is **not** an enum — it is a row in the `item_types` table (`ItemType` model), and every
`Item` points at one via `itemTypeId`. Type identity is spread across three places:

| Concern                              | Lives in                                              | Notes                                                                 |
| ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------- |
| Existence, name, icon name, hex color | `prisma/seed.ts` → `item_types` rows                  | Seeded with `isSystem: true`, `userId: null`                          |
| Which `Item` columns are populated    | `prisma/seed.ts` → `CONTENT_TYPE_BY_ITEM_TYPE`         | Maps type name → `ContentType` enum                                    |
| Rendering (icon component, colors, label) | `src/lib/item-types.ts` → `SYSTEM_TYPE_STYLES`     | Keyed by the DB `name`; Tailwind classes, not the DB hex               |

The DB `name` (singular, lowercase — `"snippet"`) is the join key across all three. The DB
`icon`/`color` columns store the Lucide icon *name* and a *hex* string, but **nothing in the app
reads them today** — components call `getSystemTypeStyle(name)` and use its Tailwind classes,
because the project forbids inline styles ([coding-standards.md](../context/coding-standards.md)).
The hex values are effectively documentation / a hook for future custom types.

`ItemType` is `@@unique([name, userId])`. System types carry `userId: null`; Postgres treats NULLs
as distinct, so the seed uses find-then-create rather than `upsert` to stay idempotent
([prisma/seed.ts:29-37](../prisma/seed.ts#L29-L37)). User-defined custom types are schema-ready
(nullable `userId`) but unimplemented — spec lists them as "Coming Soon" for Pro.

---

## The seven system types

Canonical order is defined once in `SYSTEM_TYPE_ORDER`
([src/lib/item-types.ts:41-49](../src/lib/item-types.ts#L41-L49)) and drives the sidebar, the
profile type breakdown, and collection-card icon rows.

| #   | Name (DB) | Label      | Lucide icon  | Hex (DB)  | Tailwind icon color | `ContentType` | Pro | Sidebar route     |
| --- | --------- | ---------- | ------------ | --------- | ------------------- | ------------- | :-: | ----------------- |
| 1   | `snippet` | Snippets   | `Code`       | `#3b82f6` | `text-blue-400`     | `TEXT`        |  —  | `/items/snippets` |
| 2   | `prompt`  | Prompts    | `Sparkles`   | `#8b5cf6` | `text-purple-400`   | `TEXT`        |  —  | `/items/prompts`  |
| 3   | `command` | Commands   | `Terminal`   | `#f97316` | `text-orange-400`   | `TEXT`        |  —  | `/items/commands` |
| 4   | `note`    | Notes      | `StickyNote` | `#fde047` | `text-yellow-400`   | `TEXT`        |  —  | `/items/notes`    |
| 5   | `file`    | Files      | `File`       | `#6b7280` | `text-neutral-300`  | `FILE`        | ✅  | `/items/files`    |
| 6   | `image`   | Images     | `Image`      | `#ec4899` | `text-pink-400`     | `FILE`        | ✅  | `/items/images`   |
| 7   | `link`    | Links      | `Link`       | `#10b981` | `text-green-400`    | `URL`         |  —  | `/items/links`    |

Each type also carries a `borderColor` (collection-card left accent, e.g. `border-l-blue-500`) and
a `dotColor` (sidebar collection dot, e.g. `bg-blue-500`) in the same registry. An unknown name
falls back to a neutral style (`File` icon, muted colors, label "Items") rather than throwing
([src/lib/item-types.ts:57-67](../src/lib/item-types.ts#L57-L67)).

---

## Per-type detail

### 🔷 Snippet — `snippet`

- **Icon / color:** `Code` · `#3b82f6` (blue) · `text-blue-400`
- **Content type:** `TEXT`
- **Purpose:** Reusable code — hooks, utilities, components, config blocks. The archetypal
  DevStash item; the thing developers currently scatter across VS Code, Notion, and Gists.
- **Key fields:** `title`, `content` (the code), `language` (drives syntax highlighting),
  `description`.
- **Not used:** `url`, `fileUrl`/`fileName`/`fileSize`.
- **Seed examples:** `useDebounce hook`, `Theme context provider`, `cn() className utility`
  (all `language: "typescript"`), `Multi-stage Node Dockerfile` (`language: "dockerfile"`).

### 🟣 Prompt — `prompt`

- **Icon / color:** `Sparkles` · `#8b5cf6` (purple) · `text-purple-400`
- **Content type:** `TEXT`
- **Purpose:** LLM prompts, system messages, and reusable prompt templates — the "AI-First
  Developer" persona's primary artifact. Seeded prompts use `{{placeholder}}` interpolation
  markers, though nothing in the app renders or fills them yet.
- **Key fields:** `title`, `content` (the prompt body), `description`.
- **Not used:** `language` (prompts are prose, not code — confirmed null across all seeded
  prompts), `url`, file fields.
- **Seed examples:** `Code review prompt`, `Generate docstrings`, `Refactor assistant`.

### 🟠 Command — `command`

- **Icon / color:** `Terminal` · `#f97316` (orange) · `text-orange-400`
- **Content type:** `TEXT`
- **Purpose:** One-liner shell/CLI invocations you keep re-deriving from `history` — git
  recovery, Docker cleanup, port killing.
- **Key fields:** `title`, `content` (the command line), `language` (`"bash"` on every seeded
  command), `description`.
- **Not used:** `url`, file fields.
- **Distinction from Snippet:** structurally identical (both `TEXT` + `language`); the split is
  semantic — a command is executed as-is, a snippet is pasted into a file. Content is
  typically a single line, which matters for future display (inline copy button vs. code block).
- **Seed examples:** `Undo last commit (keep changes)`, `Kill process on a port`,
  `Deploy to production`.

### 🟡 Note — `note`

- **Icon / color:** `StickyNote` · `#fde047` (yellow) · `text-yellow-400`
- **Content type:** `TEXT`
- **Purpose:** Free-form Markdown — explanations, course notes, architecture decisions, "why we
  did it this way" context.
- **Key fields:** `title`, `content` (Markdown body), `description`.
- **Not used:** `language`, `url`, file fields.
- **Status:** the only **TEXT type with zero seeded items** — it exists in `item_types` and
  renders in the sidebar with a `0` count, but there is no sample data and no editor yet.

### ⚫ File — `file` · **Pro**

- **Icon / color:** `File` · `#6b7280` (gray) · `text-neutral-300`
- **Content type:** `FILE`
- **Purpose:** Uploaded artifacts — context files, `.md` specs, templates, config exports.
  Storage target is Cloudflare R2.
- **Key fields:** `title`, `fileUrl` (R2 URL), `fileName` (original filename), `fileSize`
  (bytes), `description`.
- **Not used:** `content`, `url`, `language`.
- **Status:** **unimplemented.** Zero rows; no upload route, no R2 client (`src/lib/r2.ts`
  does not exist). `isPro: true` in the styles registry drives a `PRO` badge in the sidebar
  ([Sidebar.tsx:87-94](../src/components/dashboard/Sidebar.tsx#L87-L94)), but nothing gates
  creation yet — per spec, Pro gating is deferred until launch.

### 🩷 Image — `image` · **Pro**

- **Icon / color:** `Image` · `#ec4899` (pink) · `text-pink-400`
- **Content type:** `FILE`
- **Purpose:** Screenshots, diagrams, design references — same storage path as File, split out
  so it can render a thumbnail/preview instead of a download affordance.
- **Key fields:** identical to File: `title`, `fileUrl`, `fileName`, `fileSize`, `description`.
- **Not used:** `content`, `url`, `language`.
- **Status:** **unimplemented**, same as File. The schema has no MIME-type column, so
  "is this renderable as an image?" is inferred purely from the item's type, not the payload.

### 🟢 Link — `link`

- **Icon / color:** `Link` · `#10b981` (emerald) · `text-green-400`
- **Content type:** `URL`
- **Purpose:** Bookmarks that belong with the rest of your dev knowledge rather than in the
  browser — docs, references, design systems.
- **Key fields:** `title`, `url` (the destination), `description`.
- **Not used:** `content`, `language`, file fields.
- **Seed examples:** `Docker Documentation`, `Tailwind CSS Docs`, `shadcn/ui`,
  `Material Design 3`, `Lucide Icons`, `GitHub Actions Documentation`.
- **Note:** there is no favicon, OG-metadata, or link-preview field on `Item` — a link renders
  with its type icon like every other item.

---

## Content-type classification: TEXT vs FILE vs URL

`ContentType` is a Prisma enum on `Item` with three members
([schema.prisma:86-90](../prisma/schema.prisma#L86-L90)). It is a **derived, denormalized** value:
the seed computes it from the type name via `CONTENT_TYPE_BY_ITEM_TYPE`
([prisma/seed.ts:321-329](../prisma/seed.ts#L321-L329)), and it is stored per-item.

| `ContentType` | Types                                    | Payload column(s)                    | Storage        |
| ------------- | ---------------------------------------- | ------------------------------------ | -------------- |
| `TEXT`        | `snippet`, `prompt`, `command`, `note`   | `content` (`@db.Text`)               | Postgres       |
| `FILE`        | `file`, `image`                          | `fileUrl`, `fileName`, `fileSize`    | Cloudflare R2  |
| `URL`         | `link`                                   | `url`                                | Postgres       |

Three consequences worth knowing:

1. **4 / 2 / 1 split.** Four of seven types are TEXT, so the text path is the dominant case —
   markdown editing, search over `content`, and syntax highlighting cover the majority of items.
2. **Every payload column is nullable.** The schema does not enforce "TEXT items must have
   `content`" or "URL items must have `url`" — nothing at the database level prevents a `link`
   with a null `url`. That invariant has to be enforced in Zod validation on create/update.
3. **The mapping is duplicated per row.** `contentType` is stored on `Item` *and* derivable from
   `itemType.name`. The two can drift; the item-CRUD layer should derive it from a single shared
   constant rather than accepting it from the client. `CONTENT_TYPE_BY_ITEM_TYPE` currently lives
   in the seed script and is not exported for app use — it belongs in `src/lib/item-types.ts`.

---

## Shared properties

Every item, regardless of type, carries these ([schema.prisma:92-122](../prisma/schema.prisma#L92-L122)):

| Field                    | Type       | Notes                                                    |
| ------------------------ | ---------- | -------------------------------------------------------- |
| `id`                     | `String`   | cuid                                                      |
| `title`                  | `String`   | The only required user-supplied field                     |
| `contentType`            | enum       | Required; derived from the type                           |
| `description`            | `String?`  | Optional subtitle; rendered on rows and cards             |
| `isFavorite`             | `Boolean`  | Default `false` — ⭐ star                                  |
| `isPinned`               | `Boolean`  | Default `false` — 📌 pins to the dashboard Pinned section |
| `createdAt` / `updatedAt`| `DateTime` | `updatedAt` drives all "recent" ordering                  |
| `userId`                 | FK         | Cascade delete with the user                              |
| `itemTypeId`             | FK         | **No** cascade — types can't be deleted out from under items |
| `tags`                   | `Tag[]`    | Implicit m-n, `Tag.name` globally unique                  |
| `collections`            | `ItemCollection[]` | Explicit m-n join with `addedAt`                  |

Indexes: `userId`, `itemTypeId`, `createdAt`. Note that ordering is by `updatedAt` everywhere in
`src/lib/db/items.ts` while the index is on `createdAt` — a mismatch worth revisiting if item
counts grow.

**Type-conditional fields** (nullable, populated only for some types):

| Field       | Populated for                          | Empty for                    |
| ----------- | -------------------------------------- | ---------------------------- |
| `content`   | snippet, prompt, command, note          | file, image, link            |
| `language`  | snippet, command (in practice)           | prompt, note, link, file, image |
| `url`       | link                                     | everything else              |
| `fileUrl` / `fileName` / `fileSize` | file, image          | everything else              |

`language` is the one field whose usage is convention rather than schema or seed logic: it is
allowed on any TEXT type, but seeded only for snippets and commands.

---

## Display differences

As of today the app renders **no type-specific detail view** — differences are limited to the
icon/color treatment applied by `getSystemTypeStyle`. What exists:

| Surface                | Type-driven rendering                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Sidebar Types group     | Icon + plural label + per-type count; `PRO` badge for file/image ([Sidebar.tsx:68-98](../src/components/dashboard/Sidebar.tsx#L68-L98)) |
| Sidebar collection rows | Filled dot in the collection's **dominant type** color (`dotColor`)                        |
| Collection card         | Left border accent in the dominant type's `borderColor`, plus one icon per type present    |
| Item row                | 40px rounded tile with the type icon in `iconColor`; pin/star markers; description; tags; `updatedAt` ([ItemRow.tsx](../src/components/dashboard/ItemRow.tsx)) |
| Profile breakdown       | All seven types, zero-filled, icon + label + count                                          |

Everything else is uniform: `ItemRow` renders identically for a `link` and a `snippet` — it
shows neither the URL nor the code. The differences the spec calls for but which **do not exist
yet**:

- Syntax-highlighted code block for snippet/command (`language` is stored, never read)
- Markdown rendering for notes
- Clickable destination / favicon for links
- Thumbnail preview for images, download affordance + size for files
- Copy-to-clipboard, which is meaningful for TEXT types and meaningless for FILE types

---

## Live data snapshot

Neon `development` branch (`br-soft-voice-admxcdl2`), 2026-07-24 — all 18 seeded items belong to
the demo user:

| Type      | Items | `content` | `url` | `fileUrl` | `language` | `description` |
| --------- | ----: | --------: | ----: | --------: | ---------: | ------------: |
| `snippet` |     4 |         4 |     0 |         0 |          4 |             4 |
| `prompt`  |     3 |         3 |     0 |         0 |          0 |             3 |
| `command` |     5 |         5 |     0 |         0 |          5 |             5 |
| `note`    |     0 |         — |     — |         — |          — |             — |
| `file`    |     0 |         — |     — |         — |          — |             — |
| `image`   |     0 |         — |     — |         — |          — |             — |
| `link`    |     6 |         0 |     6 |         0 |          0 |             6 |

Each type maps to exactly one `contentType` in practice (no drift), and no item has tags — the
`Tag` table is unused by the seed, so `ItemRow`'s tag chips have never rendered with real data.

---

## Gaps and inconsistencies

Observations from this pass, none of them changed:

1. **`src/lib/constants.tsx` doesn't exist.** The research prompt and
   `context/project-overview.md` both reference it (with `ITEM_TYPE_ICONS` / `ITEM_TYPE_COLORS`
   hex maps). The real registry is `src/lib/item-types.ts`, which uses Tailwind classes instead of
   hex to satisfy the no-inline-styles rule. The overview's snippet is stale.
2. **DB `icon` and `color` columns are dead weight.** Nothing reads them; the app resolves both
   from the name-keyed TS registry. They become load-bearing only when user-defined custom types
   land — at which point custom types will need a hex→Tailwind story, since arbitrary user colors
   can't be Tailwind class names.
3. **`/items/*` and `/collections/*` routes don't exist.** The sidebar links to
   `/items/snippets` etc. and `ItemRow` links to `/items/[id]`, but `src/app` has only
   `(auth)`, `dashboard`, `profile`, and `api`. Every type link currently 404s.
4. **`CONTENT_TYPE_BY_ITEM_TYPE` is trapped in the seed script.** Item CRUD will need the same
   mapping; it should move to `src/lib/item-types.ts` and be exported rather than re-declared.
5. **No `note`, `file`, or `image` sample data**, so those sidebar rows and the profile breakdown
   have only ever been exercised at count 0.
6. **Pro gating is declarative only.** `isPro` on file/image renders a badge; it does not block
   anything, consistent with the spec's "all features during development" note.

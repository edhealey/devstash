# Current Feature: Auth Setup — NextAuth + GitHub Provider

## Status

In Progress

## Goals

- Install NextAuth v5 (`next-auth@beta`) and `@auth/prisma-adapter`
- Set up split auth config pattern for edge compatibility (`auth.config.ts` + `auth.ts`)
- Add GitHub OAuth provider
- Protect `/dashboard/*` routes via Next.js 16 proxy (`src/proxy.ts`)
- Redirect unauthenticated users to NextAuth's default sign-in page
- Extend the `Session` type with `user.id`

## Notes

Files to create:

1. `src/auth.config.ts` — edge-compatible config (providers only, no adapter)
2. `src/auth.ts` — full config with Prisma adapter + JWT strategy
3. `src/app/api/auth/[...nextauth]/route.ts` — export handlers from `auth.ts`
4. `src/proxy.ts` — route protection with redirect logic
5. `src/types/next-auth.d.ts` — extend `Session` type with `user.id`

Key gotchas:

- Use `next-auth@beta` (NOT `@latest`, which installs v4)
- Proxy file must live at `src/proxy.ts` (same level as `app/`)
- Named export: `export const proxy = auth(...)` — not a default export
- Use `session: { strategy: 'jwt' }` with the split config pattern
- Do NOT set custom `pages.signIn` — use NextAuth's default page
- Use Context7 to verify the newest config/conventions

Env vars needed: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`

Testing:

1. Go to `/dashboard` → should redirect to sign-in
2. Click "Sign in with GitHub"
3. Verify redirect back to `/dashboard` after auth

References:

- Edge compatibility: https://authjs.dev/getting-started/installation#edge-compatibility
- Prisma adapter: https://authjs.dev/getting-started/adapters/prisma

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Dashboard UI Phase 1 — ShadCN init (radix / Nova preset), `/dashboard` route with
  layout shell, dark mode by default, top bar (search + New Collection / New Item,
  display only), placeholder Sidebar and Main. Build passes; verified in browser.
- Dashboard UI Phase 2 — full sidebar from mock data: Types group (links to
  `/items/TYPE`), Collections group (Favorites + Recent), collapsible sections, user
  avatar/settings footer. Collapsible inline rail on desktop, overlay drawer on mobile
  via `SidebarProvider` context; top bar toggle wired up. Build + lint pass; verified
  in browser (desktop collapse, mobile drawer, link navigation).
- Dashboard UI Phase 3 — main content area from mock data: 4 stats cards (items,
  collections, favorite items, favorite collections), Collections grid (6 cards with
  accent border, type-icon row, "View all"), Pinned section, and 10 recent items sorted
  newest-first. Shared `type-icons` helper for consistent type icon/color rendering;
  UTC-safe date formatting. All server components. Build + lint pass; verified in
  browser (desktop + mobile responsive).
- Database Setup (Prisma 7 + Neon) — DONE, merged to main (`feature/database-setup`).
  Installed Prisma 7.8, `@prisma/adapter-pg`, `pg`, `dotenv`, `tsx`. Added
  `prisma/schema.prisma` (all models + NextAuth + `ContentType` enum, indexes, cascade
  deletes), `prisma.config.ts`, `src/lib/prisma.ts` singleton, `prisma/seed.ts`,
  `.env.example`. Generator is `prisma-client` (Rust-free) → `src/generated/prisma`;
  driver adapter `@prisma/adapter-pg`. Ran `migrate dev --name init` (migration
  `20260710173646_init`) and `db seed` against the Neon dev branch; 7 system item types
  verified; migration status in sync. Production still needs `DATABASE_URL` pointed at
  the production Neon branch + `npx prisma migrate deploy`.
- Seed Sample Data — DONE on `feature/seed-data`. Installed `bcryptjs` + `@types/bcryptjs`.
  Rewrote `prisma/seed.ts`: system item types (find-then-create), demo user
  (`demo@devstash.io`, bcryptjs 12-round hash, `isPro: false`, `emailVerified` now) via
  upsert, and 5 collections with 18 items (React Patterns 3 snippets, AI Workflows 3
  prompts, DevOps 1 snippet + 1 command + 2 links, Terminal Commands 4 commands, Design
  Resources 4 links — real URLs). Idempotent: clears the demo user's collections/items
  before re-inserting (ItemCollection removed via cascade). Ran `npx prisma db seed`
  twice against the Neon dev branch → stable 5 collections / 18 items. Build + lint pass.
- Dashboard Collections — Live Data — DONE on `feature/dashboard-collections`. Replaced the
  mock collection data + stats in the dashboard main area with live Prisma reads (still
  scoped to the seeded demo user until NextAuth lands). Added `src/lib/db/collections.ts`
  (`getRecentCollections` → per-collection item count, distinct type names, dominant type;
  `getDashboardStats` → item/collection/favorite counts) and `src/lib/item-types.ts`
  (system item-type styling keyed by DB type name — icon + icon color + accent border,
  Tailwind classes, no inline styles). `CollectionCard` now derives its accent border from
  the most-used type and renders an icon per type present; `StatsCards` takes a `stats`
  prop; `dashboard/page.tsx` is an async server component (`force-dynamic`) fetching stats
  + collections in parallel. Items sections (Pinned/Recent) still on mock — deferred per
  spec. Build + lint pass; verified in browser (18 items / 5 collections, correct
  dominant-type borders + per-type icons).
- Dashboard Items — Live Data — DONE on `feature/dashboard-items`. Replaced the mock
  Pinned/Recent item data in the dashboard main area with live Prisma reads (still scoped
  to the seeded demo user until NextAuth lands). Added `src/lib/db/items.ts`
  (`getPinnedItems` → all pinned items newest-first; `getRecentItems(limit=10)` →
  newest-first, shared `select` of only the fields a row renders + type name + tag names).
  `ItemRow` now consumes the live `ItemCardData` shape and derives its icon/color from the
  item type via `getSystemTypeStyle` (the DB-name-keyed helper shared with collection
  cards); `updatedAt` is a `Date`, description renders conditionally (nullable). `dashboard/
  page.tsx` fetches pinned + recent items in the same `Promise.all` as stats/collections;
  dropped the `mock-data` import. Deleted now-orphaned `src/lib/type-icons.ts` (ItemRow was
  its only consumer). Collection stats already live from the prior feature — no change.
  Build + lint pass; verified in browser (10 live recent items newest-first with type
  icons/dates; Pinned section correctly hidden since the seed has no pinned items).
- Stats & Sidebar — Live Data — DONE on `feature/stats-sidebar`. Moved the last mock-driven
  surface (the sidebar) onto live Prisma reads; main-area stats were already live from the
  Dashboard Collections feature. Added `getSidebarItemTypes()` to `src/lib/db/items.ts`
  (all seven system types in canonical order with the user's per-type item count, zero-filled
  via `item.groupBy` + an id→name map) and `getSidebarCollections()` to
  `src/lib/db/collections.ts` (collections split into `favorites`/`recent`, each with
  `itemCount` + `dominantType`, reusing `summarizeTypes`). Extended `src/lib/item-types.ts`
  `SystemTypeStyle` with a plural `label` (sidebar display / slug) and `dotColor` (filled-dot
  bg class). `Sidebar` is now a props-driven client component (no mock import): Types rows and
  collection dots derive icon/color/label/slug from `getSystemTypeStyle`; favorites keep the
  star, recents show a dominant-type colored dot; added a "View all collections" link →
  `/collections`; Favorites/Recent headers hide when empty. `dashboard/layout.tsx` is an async
  `force-dynamic` server component fetching sidebar data and passing it down. Trimmed
  `src/lib/mock-data.ts` to just `currentUser` (the footer, until auth). Seed updates
  (`prisma/seed.ts`): added optional `isFavorite` on collections (React Patterns, AI Workflows)
  and `isPinned` on items (useDebounce hook, Code review prompt, Undo last commit) so the
  Favorites/Pinned surfaces are demonstrable; re-seeded the Neon dev branch (stable 5
  collections / 18 items). Build + lint pass; verified in browser (live type counts + icons,
  Favorites with stars + Recent with colored dots, "View all collections" link, and the
  Pinned section showing the three pinned items).
- Add Pro Badge to Sidebar — DONE on `feature/add-pro-badge-sidebar`. Added the ShadCN
  `Badge` component (`npx shadcn add badge`, radix-nova style) at `src/components/ui/badge.tsx`.
  Extended `SystemTypeStyle` in `src/lib/item-types.ts` with an optional `isPro` flag, set
  `true` on the `file` and `image` entries (the two Pro-only system types). `Sidebar` `TypeRow`
  now renders a subtle secondary `PRO` badge (uppercase, `h-4`/`text-[9px]`, muted text) before
  the item count for Pro types; the count still shows for every type. No inline styles; Pro-ness
  lives in the single-source item-types registry rather than being hardcoded in the component.
  Build + lint pass; verified in browser (PRO badge on Files/Images alongside their counts,
  other rows unchanged).

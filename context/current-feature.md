# Current Feature

<!-- Feature name -->

Dashboard Collections — Live Data

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Replace the dummy collection data in the dashboard main area (right side) with real
data from the Neon database via Prisma. Keep the existing design — the 6 cards of
recent collections stay visually the same, sourced from the DB instead of
`src/lib/mock-data.ts`. Do not render the items underneath yet (later phase).

- Create `src/lib/db/collections.ts` with data fetching functions
- Fetch collections directly in the server component
- Collection card border color derived from the most-used content type in that collection
- Show small icons of all types present in that collection
- Keep the current design (reference `context/screenshots/dashboard-ui-main.png`)
- Update the collection stats display to reflect real data

## Notes

<!-- Any extra notes -->

Spec: `context/features/dashboard-collections-spec.md`

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

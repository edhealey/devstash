# Current Feature

Database Setup — Prisma 7 + Neon PostgreSQL

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

Set up Prisma ORM with a Neon (serverless) PostgreSQL database.

- Use **Prisma 7** — read the full upgrade guide first; it has breaking changes
  (https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7).
- Use Neon PostgreSQL (serverless). Work against a **development branch** in
  `DATABASE_URL`, with a separate production branch.
- Create the initial schema based on the data models in `@context/project-overview.md`
  (this will evolve): User, Item, ItemType, Collection, ItemCollection, Tag, plus the
  `ContentType` enum.
- Include the NextAuth models: Account, Session, VerificationToken.
- Add appropriate indexes and cascade deletes (per the schema in project-overview.md).
- Seed the system item types (snippet, prompt, command, note, file, image, link).
- **ALWAYS create migrations** (`prisma migrate dev`) — never `prisma db push` or direct
  DB edits unless explicitly specified.

## Notes

<!-- Any extra notes -->

Spec: `@context/features/database-spec.md`. References: Prisma 7 upgrade guide and the
Prisma Postgres quickstart.

### Prisma 7 decisions (breaking changes applied)

- Generator is `prisma-client` (Rust-free), not `prisma-client-js`, with a mandatory
  `output = "../src/generated/prisma"`. Generated client is gitignored + eslint-ignored.
- Import `PrismaClient` from `@/generated/prisma/client`, never `@prisma/client`.
- Driver adapter required: `@prisma/adapter-pg` + `pg` (works with Neon's Postgres
  endpoint). No Rust query engine.
- New `prisma.config.ts` holds the datasource `url` (`env("DATABASE_URL")`) and the seed
  command; `schema.prisma` `datasource` block only declares `provider = "postgresql"`.
- Seeding is explicit (`npx prisma db seed` → `tsx prisma/seed.ts`).
- `src/lib/prisma.ts` builds the adapter + client as a hot-reload-safe singleton.

### Migration + seed (done, against Neon dev branch)

- `npx prisma migrate dev --name init` → `prisma/migrations/20260710173646_init/` applied.
- `npx prisma db seed` → 7 system item types inserted; verified by query (count = 7).
- `prisma migrate status` → "Database schema is up to date!"

### Remaining

- For production: point `DATABASE_URL` at the production Neon branch and run
  `npx prisma migrate deploy` (never `db push`).

### Git History

- `5410ad6` — Initial commit from Create Next App
- `674c48b` — changes before building devstash

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
- Database Setup (Prisma 7 + Neon) — IN PROGRESS on `feature/database-setup`. Installed
  Prisma 7.8, `@prisma/adapter-pg`, `pg`, `dotenv`, `tsx`. Added `prisma/schema.prisma`
  (all models + NextAuth + `ContentType` enum, indexes, cascade deletes), `prisma.config.ts`,
  `src/lib/prisma.ts` singleton, `prisma/seed.ts`, `.env.example`. Client generates to
  `src/generated/prisma`; build + lint pass. Ran `migrate dev --name init` (migration
  `20260710173646_init`) and `db seed` against the Neon dev branch; 7 system item types
  verified. Migration status in sync.

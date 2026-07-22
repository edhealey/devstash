# Current Feature

## Status

Not Started

## Goals

<!-- Populate with bullet points of what success looks like when a feature is loaded. -->

## Notes

<!-- Additional context, constraints, or details from the spec. -->

## History

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
- Auth Setup — NextAuth + GitHub Provider — DONE on `feature/auth-setup`. Installed
  `next-auth@beta` (v5.0.0-beta.32) + `@auth/prisma-adapter`. Split config pattern for edge
  compatibility: `src/auth.config.ts` (edge-safe — GitHub provider, `session.strategy: 'jwt'`,
  and a `session` callback exposing `token.sub` as `session.user.id`, no adapter/DB) and
  `src/auth.ts` (full config spreading `authConfig` plus `PrismaAdapter(prisma)`). Added
  `src/app/api/auth/[...nextauth]/route.ts` re-exporting `handlers` as `GET`/`POST`, and
  `src/proxy.ts` — a named `export const proxy = auth(...)` (NextAuth instantiated with the
  edge-safe config only) that redirects unauthenticated `/dashboard/*` requests to NextAuth's
  default sign-in page (`/api/auth/signin`) with a `callbackUrl`; `config.matcher` scopes it to
  `/dashboard/:path*`. Extended the `Session` type in `src/types/next-auth.d.ts` with a typed
  `user.id`. Added `AUTH_SECRET` / `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` to `.env.example`, and
  gitignored `.mcp.json` (held a Context7 API key). Build passes (proxy/middleware + the
  `[...nextauth]` route compile). Live GitHub OAuth round-trip not exercised locally (no OAuth
  credentials set) — redirect logic and build verified; the sign-in flow still needs a manual
  browser pass once `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` are configured.
- Auth Credentials — Email/Password Provider — DONE on `feature/auth-credentials`, merged to
  main. Credentials provider added with the edge-safe split pattern: `auth.config.ts` holds a
  placeholder (`authorize: () => null`), `auth.ts` overrides it (matched by provider id) with
  real bcryptjs validation (`user.email` lowercased lookup + `bcrypt.compare`). `User.password`
  already existed → no migration. Registration API `POST /api/auth/register` validates
  name/email/password/confirmPassword, checks for an existing user, hashes with bcryptjs
  (12 rounds), and returns `{ success, data|error }` with proper status codes (400/409/201/500).
  Custom auth UI in an `(auth)` route group: `/login` and `/register` are `force-dynamic`
  server components rendering client forms (`LoginForm`/`RegisterForm`); `pages.signIn` and the
  proxy now point at `/login` (with `callbackUrl`, sanitized against open redirects). Login uses
  `signIn("credentials", { redirect: false })` with inline errors + a "Continue with GitHub"
  button (inline GitHub SVG since lucide dropped the brand icon). Register POSTs the API, shows a
  sonner success toast ("Account created! You can now log in."), and redirects to `/login`.
  Added the ShadCN `sonner` toast (`Toaster` in the root layout, pinned dark, `next-themes`
  removed) and a `signOutAction` server action; the sidebar footer now shows the real session
  user (via `auth()` in `dashboard/layout.tsx`) with a working sign-out, replacing the mock
  `currentUser`. Root page set to `force-dynamic` so all app pages server-render on demand.
  Build + lint pass; verified in browser (register → toast → `/login`; credentials login →
  `/dashboard`; sign-out → `/`; proxy redirect to `/login`; footer shows the logged-in user).
  Note: dashboard data is still scoped to the seeded demo user until per-user queries land;
  GitHub OAuth still needs live credentials for a real round-trip.

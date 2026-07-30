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
- Email Verification on Register — DONE on `feature/email-verification`, merged to main.
  Installed `resend`. New credentials accounts are created with `emailVerified: null` and get a
  verification link; login is blocked until they confirm. `src/lib/verification.ts` issues and
  consumes tokens against the existing `VerificationToken` model (no migration needed): a
  32-byte random token goes in the link, only its SHA-256 hash is stored, 24h TTL, single-use
  (the row is deleted on any match), and issuing a new token clears outstanding ones for that
  address. `src/lib/email.ts` wraps Resend and returns a boolean instead of throwing, so a send
  failure leaves registration at 201 and routes the user to `/verify-email` with an error toast
  rather than a 500 (inline styles in the email HTML are the one deliberate exception to the
  no-inline-styles rule — email clients don't support stylesheets). `GET /api/auth/verify-email`
  consumes the token and always redirects: success (and already-verified) → `/login?verified=1`
  with a green banner, otherwise → `/verify-email?status=expired|invalid|error`. The
  `(auth)/verify-email` page maps that status to friendly copy and renders
  `ResendVerificationForm`, which posts to `POST /api/auth/resend-verification` — that endpoint
  answers identically whether or not the address is registered, so it can't enumerate accounts.
  The unverified check in `authorize` (`src/auth.ts`) runs **after** the bcrypt compare and
  throws a `CredentialsSignin` subclass whose `code` reaches the login form via the `signIn`
  result; the constant lives in `src/lib/auth-errors.ts` so the client bundle doesn't import
  Prisma/bcrypt. GitHub OAuth is not gated. Added `APP_URL` / `EMAIL_FROM` / `RESEND_API_KEY` to
  `.env.example` (sender is Resend's test address `onboarding@resend.dev`, which only delivers
  to the Resend account owner until a domain is verified). Also added `scripts/purge-users.ts`
  (`npm run db:purge`, dry run by default, `--yes` to delete) for clearing test accounts.
  Build + lint pass; verified in browser: unsendable address → graceful 201 + resend page,
  unverified login → "Verify your email address before signing in." + resend link, wrong
  password on the same account → generic "Invalid email or password." (no leak), valid link →
  verified banner, replayed link → invalid, expired token → expired state, resend for an
  unregistered address → identical non-committal reply, post-verification login → `/dashboard`.
  Real Resend delivery confirmed end-to-end against the account owner's address. Note: the
  register/resend routes use the existing route's manual validation rather than Zod (Zod isn't
  a dependency) — worth revisiting if Zod lands project-wide.
- Toggle Email Verification via Env Flag — DONE on `feature/toggle-email-verification`, merged to
  main. Added a single source-of-truth helper `src/lib/email-verification.ts`
  (`isEmailVerificationEnabled()` — reads `EMAIL_VERIFICATION_ENABLED` at call time, defaults ON;
  returns `false` only for the literal string `false`, case-insensitive) so the two enforcement
  points and the resend route share one env read. When the gate is **off**: the register route
  (`src/app/api/auth/register/route.ts`) creates the account already verified
  (`emailVerified: new Date()`) and skips `issueVerificationEmail`; the `authorize` login gate in
  `src/auth.ts` becomes `isEmailVerificationEnabled() && !user.emailVerified`, so unverified
  accounts aren't blocked; `POST /api/auth/resend-verification` short-circuits with the same silent
  200 as the account-doesn't-exist path. The register response now carries `verificationEnabled`,
  and `RegisterForm` branches on it — off → "Account created! You can now log in." + `/login`
  (instead of the "couldn't send email" → `/verify-email` path). No schema/migration change; helper
  is imported only in Node-runtime files (never the edge `auth.config.ts`). Motivation: no domain is
  linked to Resend yet, so its test sender only delivers to the account owner — the flag lets
  local/dev/demo skip the gate until a verified domain is configured. Documented
  `EMAIL_VERIFICATION_ENABLED=true` in `.env.example`. Build + lint pass; verified in browser with
  the flag disabled (register `flagtest@example.com` → `/login`, not `/verify-email` → immediate
  login → `/dashboard`; DB confirmed `emailVerified` stamped at creation), then cleaned up the test
  account via `npm run db:purge`. The enabled default is unchanged, already-tested behavior.
- Forgot Password — DONE on `feature/forgot-password`, merged to main. Self-service password
  reset that reuses the existing `VerificationToken` model (no schema/migration). New
  `src/lib/password-reset.ts` parallels `verification.ts`: a 32-byte random token goes in the
  emailed link, only its SHA-256 hash is stored, 1h TTL, single-use (row deleted on any reset
  match). The `identifier` is namespaced `password-reset:<email>` so reset and verification
  tokens can never be confused — `consumePasswordResetToken` treats a non-reset token as invalid
  and leaves it untouched. Consuming bcrypt-hashes (12 rounds) the new password and stamps
  `emailVerified` if it was null (completing a reset proves inbox control). `src/lib/email.ts`
  gains `sendPasswordResetEmail` (Resend wrapper, boolean return, inline-style email HTML — the
  sanctioned exception). `POST /api/auth/forgot-password` is non-enumerable (identical 200
  whether or not the account exists) and only issues for accounts that actually have a password,
  so GitHub-OAuth-only accounts get the same silent reply without erroring. `POST
  /api/auth/reset-password` validates the token + password (≥8, match), returns the
  `{ success, data|error }` shape, and 400s on any bad/expired/consumed token. UI follows the
  `(auth)` group + `force-dynamic` page → client form convention: `/forgot-password`
  (`ForgotPasswordForm`, non-committal confirmation) and `/reset-password` (`ResetPasswordForm`;
  success → sonner toast + `/login?reset=1`, missing token → an invalid-link card pointing back
  to `/forgot-password`). `LoginForm` gains a "Forgot password?" link by the password field and
  a green "Password updated — you can sign in now." banner (new `reset` prop, wired from the
  login page's `?reset=1`). Reset is independent of `EMAIL_VERIFICATION_ENABLED`. No new env
  vars — reuses `APP_URL` / `RESEND_API_KEY` / `EMAIL_FROM`. Build + lint pass; verified in
  browser against the seeded demo user: login link → forgot-password submit (non-committal) →
  reset-token row created (namespaced identifier, hashed token, 1h expiry) → reset via a minted
  link → `/login?reset=1` banner → login succeeds with the new password → token row deleted
  (single-use) → replay rejected ("invalid or expired") → no-token page shows the invalid-link
  card. Demo account restored to baseline via re-seed (5 collections / 18 items, password back
  to seed value); the throwaway token-minting helper used for the browser test was deleted. Note:
  the forgot→reset→login round-trip doesn't preserve `callbackUrl` (reset always lands on
  `/login?reset=1`) — minor UX, not in scope. Real Resend delivery not re-exercised (test sender
  only reaches the account owner); the send path is shared with the already-confirmed
  verification email.
- Profile Page — DONE on `feature/profile-page`, merged to main. Protected `/profile` showing the
  signed-in user's info, usage stats, per-type breakdown, and account actions. This is the first
  surface to read the **real session user** (via `auth()`), not the seeded demo scope the dashboard
  helpers still use. New `src/lib/db/user.ts` `getUserProfile(userId)` fetches identity + item/
  collection counts + a zero-filled per-type breakdown (same `itemType.findMany` + `item.groupBy`
  id→name pattern as `getSidebarItemTypes`) in one `Promise.all`, returning `hasPassword` as a
  boolean (never the hash). Server actions in `src/actions/profile.ts`: `changePasswordAction`
  (bcrypt-compares the current password before a 12-round rehash; validates new ≥8 + match; both
  derived from `auth()`, never a client-supplied id) and `deleteAccountAction` (cascade-deletes the
  user via the schema's `onDelete: Cascade`, then `signOut({ redirectTo: "/" })`). The page
  (`src/app/profile/page.tsx`, `force-dynamic`) guards with `auth()` → `redirect("/login?callbackUrl=
  /profile")`, and renders `src/components/profile/` pieces: `ProfileHeader` (avatar → GitHub
  `User.image` or initials from name/email, UTC-safe joined date), `ProfileStats` (items +
  collections), `TypeBreakdown` (seven system types via `getSystemTypeStyle`), `ChangePasswordCard`
  (client; shown only when `hasPassword`; calls the action directly, inline errors + sonner success +
  form reset), and `DeleteAccountCard` (client; ShadCN `alert-dialog` confirmation — added via
  `npx shadcn add alert-dialog`, radix-nova). Route protection generalized: `src/proxy.ts` now covers
  `/dashboard` + `/profile` (prefix list + matcher). The sidebar footer user block is now a link to
  `/profile`. Change-password gating uses `User.password != null` (GitHub-only accounts have no
  password → card hidden); reset UI kept as the standalone focused page (not the dashboard shell) to
  honor the spec's literal `/profile`. No schema/migration change. Build + lint pass; verified in
  browser against the seeded demo user: live profile (18 items / 5 collections, per-type breakdown
  sums to 18), change-password mismatch / wrong-current / successful-change-with-reset (password
  reverted to the seed value `12345678`), delete-dialog open + cancel (demo user NOT deleted),
  sidebar link, unauthenticated `/profile` → `/login?callbackUrl`, and re-login restoring baseline.
  Note: post-login `callbackUrl` back to `/profile` falls to `/dashboard` because the login form's
  open-redirect sanitizer rejects the absolute URL the proxy sets — pre-existing, identical to the
  existing `/dashboard` behavior, not in scope. Dashboard/collections/items reads remain demo-scoped;
  only the profile is per-user so far.
- Rate Limiting for Auth — DONE on `feature/rate-limiting`, merged to main. Sliding-window rate
  limiting on the five auth endpoints via Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`),
  to blunt brute force, credential stuffing, and abuse of the three routes that send Resend email.
  New `src/lib/rate-limit.ts` is the single source of truth: a lazily built Redis client (`undefined`
  = unresolved, `null` = no Upstash configured), one memoized `Ratelimit` per named limit, a
  `RATE_LIMITS` registry holding all five configs, `getClientIp` (first `x-forwarded-for` entry →
  `x-real-ip` → the constant `"unknown"`), `rateLimitKey` for composing IP + email, `checkRateLimit`
  / `resetRateLimit`, and `rateLimitResponse` (429 + `Retry-After`). Limits: login 5/15min (IP+email),
  register 3/1h (IP), forgot-password 3/1h (IP), reset-password 5/15min (IP), resend-verification
  3/15min (IP+email). 429s return the project's `{ success, error }` shape, so all four existing forms
  surface the message with **no frontend change**; only `LoginForm` needed editing. Login is the
  exception — NextAuth owns `/api/auth/callback/credentials`, so the limit is enforced inside
  `authorize()` (which receives `request`, hence the headers) and reported via a new
  `RateLimitedError extends CredentialsSignin` whose `RATE_LIMITED_CODE` lives in
  `src/lib/auth-errors.ts` alongside the verification code — the same round trip the email-verification
  gate already used. **A successful login calls `resetRateLimit`**, so only failed attempts accumulate
  and nobody is locked out of their own account (not in the spec; deliberate). Limits are counted only
  after field validation passes: charging for validation errors would lock a user out for an hour over
  a mistyped password, and a rejected payload costs neither a DB row nor an email — abuse still
  requires well-formed payloads. Non-enumeration preserved: resend-verification consumes its token
  identically for registered and unregistered addresses, before the `isEmailVerificationEnabled()`
  short-circuit. Fails open throughout, and *fast*: the Redis client is capped at `retries: 1` (the
  library default is 5 with exponential backoff, ~12s of sleeps) and each check races a 1s timeout,
  measured at 4.4–4.7s → **0.13s** per request against an unreachable host. No schema/migration change.
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` documented in `.env.example`; leaving them blank
  disables limiting entirely. Build + lint pass; verified against a real Upstash instance: each endpoint
  429s on the N+1th request with the right `Retry-After`; a different email gets a fresh bucket
  (confirming the IP+email key); 5 malformed register payloads consume nothing while the next 3
  well-formed ones pass and the 4th is blocked (same for reset-password at 6 mismatches / 5 guesses);
  login blocked in the browser even with the correct password; 4-wrong-then-correct twice (10 attempts,
  no block) proving reset-on-success; and fail-open verified with the vars blanked.
  Notes for later: (1) **Deployment prerequisite — the host must set a trustworthy client IP header.**
  With neither `x-forwarded-for` nor `x-real-ip` present, every client shares the `"unknown"` bucket,
  capping the whole app at 3 registrations/hour; and `x-forwarded-for` is client-supplied unless a
  trusted proxy overwrites it, so on a host that only appends, an attacker mints a fresh bucket per
  request. Vercel overwrites at the edge so both are moot there — any other target needs the proxy
  configured first. (2) `@upstash/ratelimit`'s `ephemeralCache` defaults to an in-process `Map` that
  caches blocks in memory and short-circuits Redis until the reset elapses, so **clearing Redis does
  not unblock anyone**, and each instance in a multi-instance deploy keeps its own cache — this
  produced a genuinely confusing debugging session where the API returned 429 against an empty Redis.
  (3) `remaining` is returned per the spec but nothing consumes it yet (could feed an
  `X-RateLimit-Remaining` header). (4) Email goes into the Redis key uncapped since `EMAIL_REGEX`
  permits arbitrarily long addresses — a 254-char cap would close it. (5) The login form says "in a few
  minutes" rather than the spec's "in X minutes" because `CredentialsSignin.code` is a bare string with
  no room for the reset timestamp. (6) Spec's suggested rate-limiting middleware remains out of scope.
- Item Row Type Accent Border — DONE on `chore/item-row-border-and-docs`. Dashboard item rows
  (Pinned / Recent) now carry a left accent border in their item type's color, matching
  `CollectionCard`. `ItemRow` pulls `borderColor` from the existing `getSystemTypeStyle` registry
  and applies `border-l-4` + that class via `cn` — no new styling source, no inline styles. Unlike
  collection cards (which use the collection's *dominant* type), each row keys off its own item
  type. Build + lint pass; not exercised in the browser (dev server wasn't running for this pass).
- Items List View — DONE on `feature/items-list-view`, merged to main. Dynamic route
  `/items/[type]` listing the signed-in user's items of one system type in a responsive card grid
  (1 column, 2 at `md`+), each card carrying a left accent border in its own type's color. Spec:
  `context/features/item-list-view-spec.md`; every open decision was already settled by
  `docs/item-crud-architecture.md` (written 2026-07-24) and this implements its step 1 + the list
  half of step 2. **Route group:** the Sidebar/Topbar shell moved from `src/app/dashboard/layout.tsx`
  to `src/app/(dashboard)/layout.tsx` (with `dashboard/page.tsx` alongside) so `/items/*` shares the
  chrome — `(dashboard)` is not a path segment, so no URL changed; the layout's defensive
  no-session redirect dropped its now-wrong hardcoded `callbackUrl=/dashboard` (the proxy already
  sets the real destination). **Registry:** `SystemTypeStyle` gained an explicit `slug` plus
  `typeSlug(name)` / `typeNameFromSlug(slug)` in `src/lib/item-types.ts`; `Sidebar` `TypeRow` now
  reads `style.slug` instead of deriving it ad hoc with `label.toLowerCase()`. **Query:**
  `getItemsByType(userId, typeName)` in `src/lib/db/items.ts`, reusing the shared `itemSelect` /
  `ItemCardData` shape, ordered `updatedAt desc`, and filtered on `itemType: { name, isSystem: true }`
  so a future user-defined type of the same name can't leak into a system-type listing. **Page**
  (`src/app/(dashboard)/items/[type]/page.tsx`, `force-dynamic`): awaits `params` (Next 16 Promise),
  resolves the slug → `notFound()` on an unknown one (never a fall-through to an unfiltered list),
  then `auth()` → `redirect("/login?callbackUrl=/items/<slug>")`, then fetches. Header shows the
  type icon + plural label + `PRO` badge for file/image + item count. **Components:**
  `src/components/items/ItemCard.tsx` (new grid tile — icon tile, title, pin/star, 2-line
  description, tags, UTC-safe date; `border-l-4` + `borderColor` from `getSystemTypeStyle`) and
  `ItemsEmptyState.tsx` (registry-derived copy, no per-type strings). The dashboard's `ItemRow` is
  deliberately untouched — it stays the stacked-list variant, `ItemCard` is the grid variant.
  **Proxy:** `/items` added to `PROTECTED_PREFIXES` and `config.matcher`. No schema/migration, no
  new dependency. Build + lint pass; verified in browser against the seeded demo user: snippets
  (4, blue borders, 2 columns at 1440px), links (6, green), prompts/commands, notes + files (empty
  state; `PRO` badge in the Files header), `/items/bogus` → real 404, logged-out `/items/snippets`
  → `/login?callbackUrl=%2Fitems%2Fsnippets`, 390px mobile single column, and `/dashboard`
  unchanged after the route-group move. One bug caught in that browser pass: with no explicit
  `grid-cols-1`, the implicit auto grid track sized to the card's content (397px inside a 342px
  container) and cards overflowed the viewport on mobile — `grid-cols-1` (`minmax(0,1fr)`) caps the
  track, and the class carries a comment saying so. Notes for later: (1) `ItemCard` links to
  `/items/[type]/[id]` per the design doc's route table, and that detail route doesn't exist yet, so
  card clicks 404; (2) the dashboard's `ItemRow` still links to the old flat `/items/[id]`, which
  now resolves to the `[type]` route and 404s there instead — same user-visible outcome as before,
  but both hrefs should be reconciled when the detail page lands; (3) `/items` (all types) and
  `/collections` are still unrouted, so the dashboard's two "View all" links and the sidebar's
  "View all collections" remain dead; (4) list ordering is `updatedAt` while the DB index is on
  `createdAt` — the composite `@@index([userId, updatedAt])` noted in `docs/item-types.md` is still
  the migration to make when volume justifies it.
- Vitest Unit Testing Setup — DONE on `chore/vitest-setup`, committed (`1e97350`) and merged to
  main (`31baea3`); branch deleted.
  Installed `vitest` 4.1.10 as the only new dev dependency (46 transitive packages); no jsdom, no
  React Testing Library, no `@vitejs/plugin-react` — scope is **server actions and utilities only,
  no component tests**, so nothing renders and nothing needs a DOM. `vitest.config.ts`: `node`
  environment, `@/` → `./src` alias mirroring `tsconfig.json`, `include: ["src/**/*.test.ts"]`. The
  `.ts`-only pattern is how the no-components rule is *enforced* rather than merely documented — a
  component test would need `.tsx` plus jsdom plus the React plugin, so it can't be added by
  accident. Also sets `clearMocks` / `restoreMocks` / `unstubEnvs` / `unstubGlobals` so no test
  leaks state into the next. Scripts: `npm test` (`vitest run`), `npm run test:watch`, and
  `npm run typecheck` (`tsc --noEmit`). **92 tests across 6 files**, all against mocks — nothing
  touches Neon or the network, and the whole suite runs in ~250ms:
  `src/lib/item-types.test.ts` (registry integrity, canonical ordering, unknown-type fallback, slug
  round-trip, unknown slug → `null`), `src/lib/email-verification.test.ts` (default-on, only the
  literal `false` disables, re-read per call), `src/lib/rate-limit.test.ts` (`getClientIp` header
  precedence, key composition, `Retry-After` floored at 1, message pluralization, 429 body shape,
  fail-open when Upstash is unconfigured — via `vi.resetModules()` + dynamic import, since the Redis
  client is memoized at module scope), `src/actions/profile.test.ts` (`changePasswordAction`
  validation branches, 12-round hash, compare-before-hash ordering, session-derived user id, generic
  error on DB failure; `deleteAccountAction`), `src/lib/verification.test.ts` (only the SHA-256 hash
  is stored, 64-hex entropy, prior tokens invalidated before issuing, 24h TTL, single-use,
  expired/already-verified/missing-user paths), and `src/lib/password-reset.test.ts` (namespaced
  identifier, 1h TTL, **a verification token is refused and its row left intact**, `emailVerified`
  stamped only when null). Mocking convention: mock objects are declared inside `vi.hoisted` because
  `vi.mock` factories are hoisted above the imports — a plain `const` is still uninitialized when
  the factory runs (hit this as a real "Cannot access 'bcrypt' before initialization" failure).
  `@/auth` must be mocked or importing an action pulls in Prisma and the adapter at module load.
  Docs updated: `context/ai-interaction.md` workflow split old step 4 into **Unit test** (write
  tests + `npm test`) and **Verify** (browser + build/lint/typecheck), dropped "Implement unit
  testing later", commit gate now requires tests *and* build, plus a new Testing section on what is
  and isn't worth testing; `context/coding-standards.md` gained a full Testing section (scope, the
  `vi.hoisted` pattern, `vi.stubEnv`, fake timers, naming) and a tests line under File Organization;
  `CLAUDE.md` replaced "There is no test setup in this project yet" with the command list and a
  Testing summary; `context/project-overview.md` gained a Vitest row in the tech stack and
  `vitest.config.ts` in the structure listing. Two verifications worth recording: (1) the suite was
  **mutation-checked**, not just run green — deleting the `startsWith(IDENTIFIER_PREFIX)` guard in
  `password-reset.ts` fails exactly one test, and the source was restored afterward; (2) `npm run
  build` does **not** type-check test files — a deliberate `const leak: number = "not a number"`
  appended to a test still built clean, because Next only checks files reachable from the app's
  module graph. That is why `npm run typecheck` was added (it catches it, and the project is
  otherwise clean) and why the earlier draft claim that the build covered tests was wrong. Two
  incidental doc fixes: an unclosed ` ```css ` fence in `coding-standards.md` was rendering
  everything from "File Organization" down inside a code block, and `tailwind.config.ts` was removed
  from the structure listing in `project-overview.md` since the same doc set marks creating that file
  as a CRITICAL don't under Tailwind v4. Not covered, deliberately: the `src/lib/db/*` read helpers,
  the API route handlers, and `src/lib/email.ts` (a thin Resend wrapper — a test there would only
  assert the mock).
- Items Grid — Three Columns on Large Screens — DONE on `feature/items-grid-three-columns`,
  merged to main. The `/items/[type]` card grid went `1 → 2` columns and stopped; it now adds a
  third column so wide screens use the horizontal space. Entire code change is one class list in
  `src/app/(dashboard)/items/[type]/page.tsx`: `grid grid-cols-1 gap-4 md:grid-cols-2` →
  `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3`. No data, query, schema, component, or
  dependency change; `ItemCard` already sizes to its grid track, and `grid-cols-1` stayed explicit
  (it is load-bearing — see the Items List View entry for the mobile-overflow bug it fixes).
  **The breakpoint is `xl`, not `lg`, and that was decided by looking.** The spec recommended `lg`
  to match the dashboard's collections grid (`sm:grid-cols-2 lg:grid-cols-3`) on the
  preserve-existing-patterns principle. Implemented that first and it was clearly worse in the
  browser: the dashboard shell keeps an inline sidebar rail of ~256px, so at 1024px each card lands
  near 215px and *every* card title truncated ("Lucide Ic…", "Material …", "GitHub Ac…") with
  descriptions clipped to two words — a readability regression versus the two-column layout it
  replaced. Moved to `xl:grid-cols-3`, where titles read in full at 1280px. The divergence from the
  dashboard precedent is justified in a code comment: collection cards carry a name and a count,
  item cards carry a title, description and date, so they need more track. Verified in the browser
  against the seeded demo user at five widths — 390px (1 col, no horizontal overflow, sidebar as
  drawer), 768px (2), 1024px (2), 1280px (3, titles readable), 1440px (3) — plus Commands (5 items)
  laying out 3 + 2 with the partial row keeping its track width rather than stretching. Gate:
  `npm test` 92/92, lint clean, `npm run typecheck` clean, `npm run build` passes. **No unit tests
  added, deliberately** — the diff is a Tailwind class in a server component with no action, utility,
  branch, or data access; asserting on the class string would restate the implementation and break on
  a harmless reorder without ever catching a layout regression (`context/coding-standards.md`: "if it
  can't fail, it isn't earning its place"). The route's own logic is already covered — `typeNameFromSlug`
  and `getSystemTypeStyle` have 12 assertions in `src/lib/item-types.test.ts`. Notes for later:
  (1) **the real constraint is the sidebar, not the grid** — `context/project-overview.md`'s responsive
  table says the sidebar should be a drawer below 1024px with full-width main content, but the rail
  stays inline at 768–1023px; that ~256px is what makes both 768px and 1024px tight, and if the shell
  is ever brought in line with the spec, `lg:grid-cols-3` becomes viable and this breakpoint should be
  revisited; (2) `getItemsByType` in `src/lib/db/items.ts` is still untested, and its
  `itemType: { name, isSystem: true }` filter is the guard against a future user-defined type leaking
  into a system-type listing — worth a mocked-Prisma test as its own chore, still inside the
  `src/lib/db/*` exclusion the Vitest pass recorded; (3) the dev console logs a pre-existing `pg`
  SSL-mode deprecation warning (`sslmode=require` in `DATABASE_URL` changes meaning in pg v9 /
  pg-connection-string v3).
- Item Drawer — DONE on `feature/item-drawer`, committed (`7977c71`) and merged to main
  (`a659d92`); branch deleted. Spec: `context/features/item-drawer-spec.md`; visual reference
  `context/screenshots/dashboard-ui-drawer.png`. Clicking an item card now opens a right-side
  ShadCN `Sheet` with the item's full detail — **the drawer is the item detail view, there is no
  item page**. This closes the dead-link note from Items List View: `ItemCard` pointed at
  `/items/[type]/[id]` and `ItemRow` at `/items/[id]`, both 404s, and both hrefs are gone.
  Deliberately *ahead* of `docs/item-crud-architecture.md`, which recommended shipping dedicated
  routes first and wrapping in a `Sheet` later — the spec asked for the drawer directly, and since
  this is read-only display (not the `ItemForm` that doc was reasoning about) the "don't build both
  at once" warning doesn't bite.
  **Components added:** `npx shadcn add sheet skeleton` (radix-nova) → `src/components/ui/sheet.tsx`,
  `skeleton.tsx`; `button.tsx` was skipped as identical.
  **Query:** `getItemDetail(userId, itemId)` in `src/lib/db/items.ts` — the `ItemCardData` fields
  plus `contentType`, `content`, `url`, `fileUrl`/`fileName`/`fileSize`, `language`, `collections`
  (flattened from the `ItemCollection` join, ordered by `addedAt`) and `createdAt`. Reuses the
  shared `itemSelect` via spread. **`userId` is part of the `where` clause, not a check on the
  result**, so another account's item is indistinguishable from one that doesn't exist. New
  `ItemDetail extends ItemCardData`, plus `ItemDetailPayload` — the same shape with `createdAt`/
  `updatedAt` as strings, since JSON has no Date. `ContentType` is imported from
  `@/generated/prisma/enums` (an 18-line standalone module with no imports, safe to reach from a
  client component) rather than duplicating the enum.
  **API:** `GET /api/items/[id]` (`src/app/api/items/[id]/route.ts`) — awaits `params` (Next 16
  Promise), resolves the user from `auth()` and never from the request, 401 / 404 / 500 in the
  project's `{ success, data|error }` shape, underlying errors logged not returned. A route rather
  than a server action per the spec, matching `context/coding-standards.md` for a read a client
  component calls. Note it is **not** covered by `src/proxy.ts` (its matcher is `/items/:path*`,
  not `/api/items/*`), so the route's own 401 is the only gate — verified by curl.
  **State:** `src/components/items/ItemDrawerProvider.tsx` holds `open` / `card` / `detail` /
  `error` and exposes `openItem(card)` through context; mounted once inside `SidebarProvider` in
  `src/app/(dashboard)/layout.tsx`, so one drawer instance serves every section that lists items
  and the pages stay server components. `useItemDrawer()` throws outside the provider, matching
  `useSidebar`. **The fetch runs in the click handler, not an effect** — the effect version is what
  was written first and `react-hooks/set-state-in-effect` rejects it ("Calling setState
  synchronously within an effect can trigger cascading renders"), which is also the better design
  here since "fetch on click" is literally the requirement. An `AbortController` in a ref is
  aborted on a new open and on close, so a slow response for a card the user has closed or replaced
  can't land in the drawer.
  **Display:** `src/components/items/ItemDrawer.tsx` — header (type icon tile, title, type badge +
  language badge), action bar, then Description / Content / Tags / Collections / Details
  (Created / Updated, UTC-safe long dates). The header renders **instantly from the card data
  already on screen** and only the body skeletons, which is what makes it feel snappy. `ItemCard`
  and `ItemRow` became `"use client"` `<button>`s calling `openItem` (`text-left`, plus `w-full` on
  the row since a button doesn't stretch like the `Link` did).
  **Three implementation decisions worth recording.** (1) *Copy is functional, the other four
  actions are not.* Favorite/Pin/Edit/Delete render enabled with no handler, following the
  `Topbar`'s display-only precedent; Copy needs no server round trip and the content is already in
  the drawer, so leaving it dead would have been worse. It is disabled while loading and when there
  is nothing to copy. (2) *Content is one section, not per-type rendering.* It shows
  `content ?? url ?? fileName` in a mono `<pre>`; a link item would otherwise show an empty Content
  section, and real per-type display (highlighting, markdown, image preview, file download) is the
  later feature the architecture doc plans. (3) *Pinned state uses `fill-current`, not a second
  color* — the spec only specifies yellow for the favorite star, and a second accent would compete
  with it.
  **Two bugs the browser pass caught, both invisible to the build.** (a) `SheetContent`'s width
  defaults are data-attribute-scoped (`data-[side=right]:w-3/4`, `data-[side=right]:sm:max-w-sm`),
  so a plain `sm:max-w-xl` loses on specificity and `cn`/tailwind-merge can't dedupe across
  different variants — the panel stayed 384px and code was clipped mid-token. The override now
  carries the same `data-[side=right]:` prefix, with a comment saying why. (b) At 390px the five
  actions overflowed: "Edit" was clipped and Delete was off-screen entirely. Fixed with
  `flex-wrap` on the action row plus full width below `sm`.
  **Seed:** `SeedItem` gained optional `tags?: string[]` (connected via `connectOrCreate`, so items
  share tag rows) and `isFavorite?: boolean`. The seed had **no tags at all and no favorited
  items**, so the drawer's Tags section and the yellow star — and `ItemCard`'s tag row, which has
  never rendered since it was written — could not be exercised. Tagged five items across snippets/
  prompts/commands/links; same rationale and precedent as the Stats & Sidebar pass adding
  `isPinned`/collection favorites. Re-seeded the Neon dev branch: still 5 collections / 18 items.
  No schema/migration change, no new dependency.
  **Tests:** 10 new (102 total, 8 files). `src/app/api/items/[id]/route.test.ts` (6) — unauthenticated
  caller 401s **before** the query is called, session with no `user.id` also 401s, the lookup uses
  the session id rather than anything from the request, 200 shape, missing/other-owner → 404, and a
  throwing query → 500 with a generic message. `src/lib/db/items.test.ts` (4) — `getItemDetail`'s
  ownership filter, `null` on no match, and the type/tag/collection flattening; plus one for
  `getItemsByType`'s `isSystem: true` filter, which the previous feature's notes had flagged as
  untested. **Mutation-checked:** dropping `userId` from `getItemDetail`'s `where` fails exactly one
  test, and the source was restored. Not tested, deliberately: the two drawer components (no jsdom /
  React plugin, and `vitest.config.ts` matches `.ts` only, which is how that rule is enforced);
  `contentValue()` and `formatFullDate()` inside `ItemDrawer.tsx` (a two-term `??` chain and the same
  formatter already unexported in `ItemCard`/`ItemRow` — extracting either just to make it importable
  would be churn for a test that can't fail); `prisma/seed.ts`; and Date→ISO serialization in the
  response, which is `NextResponse.json` behavior rather than ours.
  Gate: `npm test` 102/102, lint clean, `npm run typecheck` clean, `npm run build` passes.
  **Verified in the browser** against the seeded demo user: drawer opens from dashboard Pinned/Recent
  rows and from `/items/[type]` cards; snippet with code, `typescript` badge, three tags, collection
  and dates; link item showing its URL in Content with no language badge; Copy writes to the
  clipboard (asserted `navigator.clipboard.readText()`) and toasts; loading state confirmed against a
  throttled fetch (title present from card data, 6 skeleton blocks, Copy disabled); error branch shows
  "Item not found."; unauthenticated `curl /api/items/x` → 401; Escape closes; switching items swaps
  content with no stale data; 390px full-width with the action bar wrapping; 1440px at 576px wide.
  Console clean apart from the pre-existing `pg` SSL warning.
  Notes for later: (1) **the provider's abort logic has no automated test** — it is browser-verified
  only, and won't be testable until the project takes on a DOM environment; (2) the four inert action
  buttons look clickable and do nothing, which is the spec's intent but is the most likely thing to
  read as a bug before the mutations land; (3) `/items` (all types) and `/collections` are still
  unrouted, so the dashboard's two "View all" links and the sidebar's "View all collections" remain
  dead; (4) the drawer refetches on every open with no caching — fine at this scale, but a
  `Map` keyed by item id in the provider is the cheap win if it ever feels slow; (5) `ItemCard` and
  `ItemRow` are now client components, so `ItemCardData` is imported type-only from `@/lib/db/items`
  (which imports Prisma) — SWC elides it and `Sidebar` already did the same with `ItemTypeSummary`,
  but if that ever leaks into a bundle the fix is moving the shared types to `src/types/items.ts`.

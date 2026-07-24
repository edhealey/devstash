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

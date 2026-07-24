# Auth Security Review

**Last audit:** 2026-07-23
**Scope:** NextAuth v5 config, credentials + GitHub providers, registration, email verification, forgot/reset password, profile page + account actions
**Files reviewed:** 25

`src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/app/api/auth/[...nextauth]/route.ts`,
`src/app/api/auth/register/route.ts`, `src/app/api/auth/verify-email/route.ts`,
`src/app/api/auth/resend-verification/route.ts`, `src/app/api/auth/forgot-password/route.ts`,
`src/app/api/auth/reset-password/route.ts`, `src/lib/verification.ts`, `src/lib/password-reset.ts`,
`src/lib/email-verification.ts`, `src/lib/email.ts`, `src/lib/auth-errors.ts`,
`src/app/profile/page.tsx`, `src/actions/profile.ts`, `src/lib/db/user.ts`,
`src/components/profile/ChangePasswordCard.tsx`, `src/components/profile/DeleteAccountCard.tsx`,
`src/components/auth/LoginForm.tsx`, `src/app/(auth)/login/page.tsx`, `prisma/schema.prisma`,
`src/lib/db/items.ts`, `src/lib/db/collections.ts`, `src/app/dashboard/layout.tsx`

## Summary

The token handling in this auth stack is well built — CSPRNG generation, hash-at-rest, enforced
expiry, and genuine single-use deletion are all correct in both the verification and reset flows,
and the namespaced identifier that keeps the two token kinds apart is a real design win.
Authentication is solid; **authorization is where the hole is**. The dashboard's data layer still
reads a hardcoded demo account rather than the session user, so every account that signs in is
served another user's items and collections — that is the one finding to fix first. Beyond it, the
gaps are the ones a framework can't close for you: **there is no rate limiting on any auth
endpoint**, the login page's **`callbackUrl` sanitizer is bypassable with a backslash**, and
**existing sessions survive a password reset or change** because the JWT strategy has no
server-side revocation. Five lower-severity hardening items follow.

**Findings:** 0 Critical · 1 High · 3 Medium · 4 Low · 1 Informational

## Findings

### Critical

None found.

### High

#### 1. Every signed-in user is served the demo account's data

- **Severity:** High
- **Location:** `src/lib/db/items.ts:9, 61, 71, 97`, `src/lib/db/collections.ts:9, 61, 105, 136`,
  `src/app/dashboard/layout.tsx:16-20`
- **Issue:** Both dashboard data modules define `const DEMO_USER_EMAIL = "demo@devstash.io"` and
  scope **every** query with `where: { user: { email: DEMO_USER_EMAIL } }`. None of the six
  exported helpers — `getPinnedItems`, `getRecentItems`, `getSidebarItemTypes`,
  `getRecentCollections`, `getSidebarCollections`, `getDashboardStats` — accepts a user id, and
  `dashboard/layout.tsx` calls `auth()` purely to render the footer avatar; the session user id is
  never passed to a query. The file comments say "Auth is not wired up yet" and pre-date NextAuth
  landing, but the code is live behind the auth wall today.
- **Impact:** Any person who registers an account and reaches `/dashboard` is shown the demo
  user's items, collections, tags, titles, descriptions, and counts as if they were their own.
  This is a cross-tenant read: the authorization check that should scope data to the requester
  does not exist, and the proxy's authentication check masks it by making the page *look*
  protected. Today the exposed account is seeded fixture data, so the practical blast radius is
  small — but the same code path will serve real user data the moment items CRUD ships, and the
  bug is invisible in testing because the developer is usually signed in as the demo user anyway.
  `getDashboardStats` is also the natural place to enforce the free-tier 50-item / 3-collection
  limits, and it currently counts the wrong account's rows.
- **Fix:** Thread the session user id through, the way `getUserProfile` already does correctly
  (`src/lib/db/user.ts:28-30`). Delete both `DEMO_USER_EMAIL` constants, give each helper a
  required `userId: string` parameter, and resolve it once per request in the layout and page:

  ```ts
  // src/app/dashboard/layout.tsx
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [types, { favorites, recent }] = await Promise.all([
    getSidebarItemTypes(session.user.id),
    getSidebarCollections(session.user.id),
  ]);
  ```

  Making `userId` a **required** parameter rather than an optional one with a demo fallback is the
  point — it turns any missed call site into a build error instead of a silent cross-tenant read.
  Also switch the `where` clauses from the `user: { email }` relation filter to `{ userId }`
  directly, which matches the `@@index([userId])` already on both tables
  (`prisma/schema.prisma`) and avoids a join per query.

### Medium

#### 2. No rate limiting on any authentication endpoint

- **Severity:** Medium
- **Location:** `src/auth.ts:28` (credentials `authorize`), `src/app/api/auth/register/route.ts:10`, `src/app/api/auth/forgot-password/route.ts:11`, `src/app/api/auth/resend-verification/route.ts:12`, `src/app/api/auth/reset-password/route.ts:10`
- **Issue:** No throttling, lockout, backoff, or CAPTCHA exists anywhere in the codebase — a
  repo-wide grep for rate-limiting patterns and packages returns nothing. Every auth endpoint
  accepts unlimited requests from a single IP or against a single account. NextAuth does not
  provide this; `authorize()` is called on every POST to `/api/auth/callback/credentials`.
- **Impact:** Three distinct problems. (a) **Credential stuffing / brute force** — an attacker can
  hammer `/api/auth/callback/credentials` against a known email indefinitely; the only cost is
  bcrypt's ~100ms, and that cost lands on your server, not theirs. (b) **Email flooding** — a
  script POSTing `/api/auth/forgot-password` or `/api/auth/resend-verification` in a loop mails a
  real victim's inbox without limit and burns your Resend quota, which is billed. Both endpoints
  correctly return 200 regardless of outcome, so there is nothing to slow an attacker down.
  (c) **Reset-token guessing** — unlimited attempts against `/api/auth/reset-password`. The 256-bit
  token makes this infeasible today, so this leg is theoretical; (a) and (b) are not.
- **Fix:** Add a shared limiter and apply it before any DB work in each handler. For serverless
  Next.js, `@upstash/ratelimit` + `@upstash/redis` is the usual fit (in-memory counters don't
  survive across lambda instances). Suggested budgets: login 5 attempts / 15 min per
  `email + IP`; forgot-password and resend-verification 3 / hour per email **and** 10 / hour per
  IP; register 5 / hour per IP. Return 429 with a generic message, and keep the response shape
  identical to the success path on the email endpoints so the limiter doesn't become its own
  enumeration oracle.

  ```ts
  // src/lib/rate-limit.ts
  import { Ratelimit } from "@upstash/ratelimit";
  import { Redis } from "@upstash/redis";

  export const loginLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:login",
  });
  ```

#### 3. Post-login open redirect — the `callbackUrl` sanitizer is bypassable with a backslash

- **Severity:** Medium
- **Location:** `src/app/(auth)/login/page.tsx:6-11`, `src/components/auth/LoginForm.tsx:67`
- **Issue:** `safeCallbackUrl` accepts any value that starts with `/` but not `//`. A backslash
  slips through: `/\evil.com` passes both checks, is handed to `LoginForm` as the `callbackUrl`
  prop, and reaches `router.push(callbackUrl)` on successful sign-in. The WHATWG URL parser treats
  `\` as equivalent to `/` for HTTP URLs, so the browser resolves it to a different origin.
  Verified against this codebase on Next 16.2.9:

  ```
  $ curl -s 'http://localhost:3000/login?callbackUrl=/%5Cevil.com' | grep callbackUrl
  callbackUrl\":\"/\\\\evil.com\"          # sanitizer passed it straight through

  $ node -e 'console.log(new URL("/\\evil.com", "http://localhost:3000/login").href)'
  http://evil.com/                          # what router.push resolves it to
  ```

- **Impact:** An attacker sends `https://devstash.app/login?callbackUrl=/\evil.com`. The victim
  sees a legitimate origin and a real login form, signs in successfully, and is then bounced to
  the attacker's site — which can present a convincing "session expired, sign in again" page and
  harvest the credentials the user just proved they know. Landing on the phishing page *after* a
  successful login is what makes this effective; the user has no reason to suspect the redirect.
  The GitHub button is **not** affected: `signIn("github", { callbackUrl })` routes through
  Auth.js's own `redirect` callback, which prefixes `baseUrl` and yields the harmless same-origin
  `http://localhost:3000//evil.com`. Only the credentials path, which redirects client-side, is
  exploitable.
- **Fix:** Don't pattern-match on the string — parse it against a throwaway base and keep only the
  path, which normalizes the backslash away and rejects anything that escapes the origin:

  ```ts
  // src/app/(auth)/login/page.tsx
  function safeCallbackUrl(value: string | string[] | undefined) {
    if (typeof value !== "string") return "/dashboard";
    try {
      const base = "http://internal.invalid";
      const url = new URL(value, base);
      // Any absolute, protocol-relative, or backslash-smuggled value lands off-origin.
      if (url.origin !== base) return "/dashboard";
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "/dashboard";
    }
  }
  ```

  While you're here: `src/proxy.ts:21` sets `callbackUrl` to `req.nextUrl.href` — a full absolute
  URL — which this sanitizer rejects, which is why a proxy redirect to `/profile` currently lands
  on `/dashboard` after login (noted as a known quirk in `context/current-feature.md`). Setting
  `signInUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search)` fixes that quirk and
  keeps the value in the relative form the sanitizer expects.

#### 4. Password reset and password change do not invalidate existing sessions

- **Severity:** Medium
- **Location:** `src/lib/password-reset.ts:100-108`, `src/actions/profile.ts:70-73`, `src/auth.config.ts:23`
- **Issue:** Both paths update `user.password` and stop there. With `session: { strategy: "jwt" }`
  the session lives entirely in a signed cookie with no server-side record, so already-issued
  tokens stay valid until they expire on their own (Auth.js default `maxAge` is 30 days).
  Confirmed against the Auth.js docs: *"Expiring a JSON Web Token before its encoded expiry is not
  possible"* without a server-side blocklist.
- **Impact:** This defeats the main reason people reset a password. A user who suspects compromise
  resets their password, gets a success banner, and reasonably believes the attacker is locked
  out — but the attacker's existing session cookie keeps working for up to 30 days, including
  access to `/profile`, where they can change the password again and lock the real owner out. The
  same applies to the deliberate change-password flow: signing out other devices is exactly what
  users expect that button to do.
- **Fix:** Two options, in order of preference:
  1. Add a `passwordChangedAt DateTime?` column to `User`, stamp it on every password write, and
     compare it in the `jwt` callback — reject the token when `token.iat` predates it. This keeps
     the JWT strategy and its edge-compatibility.

     ```ts
     // src/auth.config.ts — callbacks
     async jwt({ token }) {
       // needs a DB read; move this callback to auth.ts (Node runtime) if kept
       return token;
     }
     ```
  2. Switch to `strategy: "database"`. The `Session` model and Prisma adapter are already wired
     (`prisma/schema.prisma:64-71`), so you could then delete that user's session rows on a
     password write and get "sign out everywhere" for free. Costs a DB read per request and
     complicates the edge proxy.

  Whichever you pick, apply it to **both** `consumePasswordResetToken` and `changePasswordAction`.
  Until then, consider a note in the reset-success copy telling users to sign out other devices.

### Low

#### 5. User enumeration via response timing

- **Severity:** Low
- **Location:** `src/auth.ts:38-45`, `src/app/api/auth/forgot-password/route.ts:42-44`, `src/app/api/auth/resend-verification/route.ts:48-50`
- **Issue:** The response *bodies* are correctly identical in all three places, but the *time*
  taken is not. In `authorize`, an unknown email returns at line 39 before `bcrypt.compare` runs,
  while a known email pays the full bcrypt cost — a difference of roughly 100ms. In
  forgot-password and resend-verification, the handler `await`s the Resend API call only when the
  account exists, which adds several hundred milliseconds for real accounts and nothing for
  strangers.
- **Impact:** An attacker who times responses can determine which email addresses have accounts,
  even though every response body and status code is identical. The deltas here are large enough
  to read reliably over a normal internet connection without statistical averaging. This compounds
  with finding #2: with no rate limit, an attacker can time-probe a large address list cheaply and
  produce a validated target list for credential stuffing or phishing.
- **Fix:** In `authorize`, compare against a dummy hash when the user is missing so both paths do
  equal work:

  ```ts
  // src/auth.ts
  const DUMMY_HASH = "$2a$12$........................................"; // any valid 12-round hash
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user?.password || !passwordMatches) return null;
  ```

  In the two email endpoints, don't `await` the send — fire it and respond immediately (or push it
  onto a queue), so the response time no longer depends on whether an email went out:

  ```ts
  if (user?.password) {
    void issuePasswordResetEmail(user.email, user.name); // already catches internally
  }
  ```

  `issuePasswordResetEmail` and `issueVerificationEmail` both swallow their own errors and return
  a boolean, so dropping the `await` is safe here.

#### 6. Account deletion requires no re-authentication

- **Severity:** Low
- **Location:** `src/actions/profile.ts:85-94`, `src/components/profile/DeleteAccountCard.tsx:23-33`
- **Issue:** `deleteAccountAction` takes no arguments and checks only that a session exists. The
  sole confirmation is the client-side `AlertDialog`. By contrast, `changePasswordAction`
  (line 64) correctly requires the current password before it will act.
- **Impact:** Anyone with a live session — a borrowed or unlocked laptop, a stolen session cookie,
  or a session that survived a password reset per finding #4 — can irreversibly destroy the
  account and every item and collection in it with two clicks and no secret knowledge. The
  cascade in `prisma/schema.prisma` makes this unrecoverable. The security bar for the most
  destructive action in the app is currently lower than the bar for changing a password.
- **Fix:** Require the account password (or, for GitHub-only accounts, typing the email address)
  in the dialog and verify it server-side before deleting:

  ```ts
  export async function deleteAccountAction(input: { password?: string }): Promise<ActionResult> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "You must be signed in." };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (user?.password) {
      const ok = await bcrypt.compare(input.password ?? "", user.password);
      if (!ok) return { success: false, error: "Password is incorrect." };
    }
    await prisma.user.delete({ where: { id: userId } });
    await signOut({ redirectTo: "/" });
  }
  ```

  Note this also means the action should return `ActionResult` rather than `void`, so the card can
  surface the error inline.

#### 7. Passwords are silently truncated at 72 bytes with no maximum length enforced

- **Severity:** Low
- **Location:** `src/app/api/auth/register/route.ts:57`, `src/app/api/auth/reset-password/route.ts:45`, `src/actions/profile.ts:40`
- **Issue:** All three paths check a minimum of 8 characters but set no maximum. bcrypt — including
  `bcryptjs` — only reads the first 72 bytes of its input and discards the rest without warning.
- **Impact:** A user with a 100-character passphrase is authenticated on the first 72 bytes alone;
  the remainder contributes nothing. Anyone who knows the first 72 bytes can sign in. In practice
  72 bytes is ample entropy, so this is a correctness surprise rather than a realistic break —
  but it is silent, and a password manager generating long strings makes it more likely than it
  sounds. Multi-byte characters (emoji, non-Latin scripts) hit the byte limit sooner than the
  character count suggests.
- **Fix:** Enforce a maximum alongside each existing minimum check — OWASP suggests 64 characters
  for bcrypt, which stays clear of the byte limit even for multi-byte input. Add the same
  `maxLength` to the client inputs so users find out before they submit.

  ```ts
  const MAX_PASSWORD_LENGTH = 64;
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { success: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }
  ```

#### 8. `consumeVerificationToken` deletes non-verification tokens before checking the namespace

- **Severity:** Low
- **Location:** `src/lib/verification.ts:60-65`
- **Issue:** The verification consumer looks up by token hash and deletes the row immediately, then
  discovers the identifier doesn't match a user and returns `"invalid"`. Its counterpart
  `consumePasswordResetToken` (`src/lib/password-reset.ts:80-84`) gets this right — it checks
  `record.identifier.startsWith(IDENTIFIER_PREFIX)` and bails **before** deleting, explicitly to
  leave the other flow's rows untouched. The verification side has no matching guard.
- **Impact:** Submitting a password-reset token to `GET /api/auth/verify-email?token=…` destroys
  it, invalidating the user's reset link and forcing them to request another. Impact is genuinely
  minimal: to do this you must already hold the reset token, and holding it lets you simply reset
  the password instead, which is strictly worse for the victim. No cross-flow privilege escalation
  is possible — the namespace check does its job on the reset side, and a reset token's
  `password-reset:` identifier can never match a `User.email`, so it cannot be redeemed for
  verification. Reported for symmetry, not because it is exploitable.
- **Fix:** Mirror the guard from `password-reset.ts` — reject and leave the row alone when the
  identifier is namespaced:

  ```ts
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.identifier.includes(":")) {
    return "invalid";
  }
  await prisma.verificationToken.delete({ where: { token } });
  ```

### Informational

#### 9. Registration confirms whether an email is already in use

- **Severity:** Informational
- **Location:** `src/app/api/auth/register/route.ts:78-83`
- **Issue:** Registering with an existing address returns `409` and "An account with this email
  already exists", which confirms the address is registered. The forgot-password and
  resend-verification endpoints are deliberately non-committal, so this is the one place account
  existence is stated outright.
- **Impact:** An enumeration vector, but a conventional one — nearly every consumer signup does
  this, because the alternative (a generic success plus a "someone tried to register your
  address" email) confuses users who genuinely forgot they had an account. Recorded so the
  tradeoff is a decision rather than an oversight. **No action recommended** unless the threat
  model changes; if it does, the fix is to return 201 regardless and email the existing account
  instead of creating a new one.

## Passed Checks

Verified as correctly implemented:

**Token generation and storage**
- Both flows use `crypto.randomBytes(32)` — a CSPRNG at 256 bits, well above the 128-bit floor.
  No `Math.random()` anywhere in the auth code (`src/lib/verification.ts:23`,
  `src/lib/password-reset.ts:36`).
- Only the SHA-256 hash of a token is persisted; the raw token exists solely in the emailed link,
  so a database read cannot yield a usable link (`src/lib/verification.ts:10-12`,
  `src/lib/password-reset.ts:21-23`).
- Lookups are `findUnique({ where: { token } })` against the hash on a `@unique` column
  (`prisma/schema.prisma:76`) — an exact match, no partial or wildcard matching possible.

**Expiry and single-use**
- Verification tokens expire in 24h, reset tokens in 1h (`src/lib/verification.ts:6`,
  `src/lib/password-reset.ts:7`). The shorter window on the more dangerous token is the right call.
- Expiry is genuinely **enforced at consumption**, not merely stored — `record.expires < new Date()`
  is checked on every redemption (`src/lib/verification.ts:67`, `src/lib/password-reset.ts:86`).
- Single-use is real: the row is deleted on any match, expired or not, and *before* the expiry
  check — so a token cannot be replayed even by racing the expiry boundary
  (`src/lib/verification.ts:65`, `src/lib/password-reset.ts:84`).
- Issuing a new token clears outstanding ones for the same identifier, so only the newest link
  works (`src/lib/verification.ts:21`, `src/lib/password-reset.ts:32-34`).
- A concurrent double-redemption is safe: the second `delete` throws on the missing row and is
  caught by the route handler, so only one request can complete a reset.

**Token namespacing**
- Reset tokens are stored under `password-reset:<email>` and `consumePasswordResetToken` rejects
  any token whose identifier lacks that prefix, leaving the row intact
  (`src/lib/password-reset.ts:13, 80-82`). A verification token cannot be redeemed as a reset
  token. The reverse is also blocked, since a `password-reset:` identifier can never match a
  `User.email` lookup (`src/lib/verification.ts:71-77`).

**Password hashing**
- bcrypt at 12 rounds — above the common floor of 10 — consistently across all three write paths:
  registration (`src/app/api/auth/register/route.ts:85`), reset
  (`src/lib/password-reset.ts:99`), and change (`src/actions/profile.ts:69`).
- Verification uses `bcrypt.compare`, never string equality (`src/auth.ts:42`,
  `src/actions/profile.ts:64`).
- The hash never leaves the server. `getUserProfile` selects `password` but returns only
  `hasPassword: Boolean(user.password)` (`src/lib/db/user.ts:41, 78`), and `changePasswordAction`
  selects it into a local scope only (`src/actions/profile.ts:54`). No client component receives
  it.
- Minimum length is enforced **server-side** in all three paths, not just via the client
  `minLength` attribute, and confirm-password matching is likewise re-checked on the server.

**Session validation and authorization**
- Every mutation derives the user id from `auth()`, never from client input —
  `changePasswordAction` and `deleteAccountAction` take no user id parameter at all
  (`src/actions/profile.ts:24-25, 86-87`). There is no id-in-body pattern to abuse.
- `changePasswordAction` requires and verifies the **current** password before rehashing
  (`src/actions/profile.ts:64-67`), so an unlocked session alone can't silently swap the password.
- The profile page guards with `auth()` and redirects unauthenticated visitors
  (`src/app/profile/page.tsx:17-20`), and handles the dangling-session case where the user record
  no longer exists (line 25).
- `src/proxy.ts` protects `/dashboard` and `/profile`, and the `config.matcher` at line 27
  actually covers both prefixes — the prefix list and the matcher agree, which is the usual place
  this goes wrong.
- Account deletion relies on schema-level `onDelete: Cascade`, and those cascades genuinely exist
  on the `Account` and `Session` relations (`prisma/schema.prisma:57, 69`) plus the item and
  collection relations — no orphaned rows.

**Enumeration resistance (response bodies)**
- `/api/auth/forgot-password` and `/api/auth/resend-verification` return an identical
  `{ success: true, data: null }` 200 whether or not the account exists, and swallow internal
  errors rather than leaking them (`forgot-password/route.ts:45-49`,
  `resend-verification/route.ts:51-55`). Only the timing differs — see finding #5.
- Login returns a single generic "Invalid email or password." for both unknown-email and
  wrong-password (`src/components/auth/LoginForm.tsx:61`).
- The unverified-account check runs **after** `bcrypt.compare` succeeds
  (`src/auth.ts:47-52`), so the "verify your email" message is only ever shown to someone who
  already proved they know the password. This is a subtle ordering detail and it is correct.
- Forgot-password only issues for accounts that actually have a password, so GitHub-only accounts
  get the same silent 200 rather than an error (`forgot-password/route.ts:42`).

**Configuration**
- `EMAIL_VERIFICATION_ENABLED` **fails closed**: `isEmailVerificationEnabled()` returns `true` for
  unset, empty, misspelled, or any value other than the literal `"false"`
  (`src/lib/email-verification.ts:12`). A typo or a missing env var leaves the gate on.
- The flag is read only in Node-runtime files (`src/auth.ts`, register and resend-verification
  routes) and never in the edge-safe `src/auth.config.ts`.
- The edge/Node split is clean — `auth.config.ts` has no adapter, no Prisma, and no bcrypt; its
  placeholder `authorize` returns `null` unconditionally (`src/auth.config.ts:20`), so the edge
  runtime can never authenticate anyone on its own.
- `/api/auth/verify-email` builds redirects from `new URL(request.url).origin` with fixed relative
  paths and never reflects the token into a response body — no open redirect, no token in HTML
  (`verify-email/route.ts:9-31`).
- The login page attempts to sanitize `callbackUrl` and does reject absolute URLs and
  protocol-relative `//evil.com` — but the check is **not** sufficient; see finding #3 for the
  backslash bypass (`src/app/(auth)/login/page.tsx:6-11`).
- Tokens are never logged; the error paths log a message and the caught error, not the token
  (`src/lib/verification.ts:43`, `src/lib/password-reset.ts:59`).
- All auth env vars are documented in `.env.example`, and `.gitignore:34-35` excludes `.env*`
  while keeping `.env.example` tracked.

## Hardening Opportunities (Not Vulnerabilities)

- **Notification emails on security events.** Neither a password change nor a password reset tells
  the user it happened. An "your password was changed" email is the cheapest way for a victim to
  notice an account takeover, and it pairs naturally with the fix for finding #4.
- **Zod validation.** The auth routes hand-roll their type checks. They are correct as written and
  consistently applied, so this is a consistency and maintainability point rather than a security
  one — but the project's own coding standards call for Zod, and these routes predate that
  dependency landing.

## Out of Scope (Handled by NextAuth)

Deliberately not audited, because Auth.js v5 owns them: CSRF tokens on auth routes, session cookie
flags and `__Secure-`/`__Host-` prefixes, JWT signing and encryption, and the GitHub provider's
OAuth `state`/PKCE handling.

Sources consulted: [Auth.js — Session Strategies](https://authjs.dev/concepts/session-strategies),
[Auth.js — Credentials provider](https://authjs.dev/getting-started/providers/credentials)

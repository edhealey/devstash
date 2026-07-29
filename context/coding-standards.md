# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Stripe, GitHub, etc.)
  - File uploads with progress tracking
  - Long-running operations
  - Specific HTTP status codes or headers
  - Endpoints for future mobile/CLI clients
  - Third-party integrations
- Otherwise, fetch data directly in server components
- Dynamic routes for item/collection pages

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive in `src/app/globals.css`
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

## File Organization

- Components: `src/components/[feature]/ComponentName.tsx`
- Pages: `src/app/[route]/page.tsx`
- Server Actions: `src/actions/[feature].ts`
- Types: `src/types/[feature].ts`
- Lib/Utils: `src/lib/[utility].ts`
- Tests: next to the code under test — `src/lib/[utility].test.ts`, `src/actions/[feature].test.ts`

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Use shadcn/ui components where applicable
- No inline styles
- Dark mode first, light mode as option

## Database

- Use Prisma ORM for all database operations
- Always use `prisma migrate dev` for schema changes (not `db push`)
- Run `prisma migrate status` before committing to verify migrations are in sync
- Production deployments must run `prisma migrate deploy` before the app starts

## Data Fetching

- Server components fetch directly with Prisma
- Client components use Server Actions
- Validate all inputs with Zod

## Error Handling

- Use try/catch in Server Actions
- Return `{ success, data, error }` pattern from actions
- Display user-friendly error messages via toast

## Testing

Vitest (`node` environment), configured in `vitest.config.ts`. Run with `npm test` or
`npm run test:watch`.

### Scope

- **Server actions and utilities only.** No component tests — nothing renders in these
  tests, so there is no jsdom environment and no React plugin installed.
- `vitest.config.ts` matches `src/**/*.test.ts`. Adding a component test would mean
  adding a `.tsx` pattern, jsdom, and `@vitejs/plugin-react` — a deliberate decision, not
  something to slip in.
- Worth testing: validation and branching, auth/security decisions, pure transforms,
  token and env-flag logic, and the `{ success, data, error }` shape actions return.
- Not worth testing: functions that only forward to Prisma, Resend, or Upstash; the
  generated Prisma client; anything whose test would just restate the implementation.

### Rules

- **Never touch the database or the network.** Mock `@/lib/prisma` with `vi.mock`, along
  with `@/auth`, `@/lib/email`, and `bcryptjs` where the module under test imports them.
  `@/auth` must be mocked or the import pulls in Prisma and the adapter at load time.
- Declare mock objects inside `vi.hoisted` — `vi.mock` factories are hoisted above the
  imports, so a plain `const` is still uninitialized when the factory runs.
- Config sets `clearMocks`, `restoreMocks`, `unstubEnvs`, and `unstubGlobals`, so call
  history, spies, and env stubs are reset between tests. Set up the happy path in
  `beforeEach` and let each test override only what it exercises.
- Read env with `vi.stubEnv`. Vitest does not copy `.env` into `process.env`, so tests
  never see real credentials. For a module that memoizes an env read at module scope, use
  `vi.resetModules()` plus a dynamic `import()`.
- Pin the clock with `vi.useFakeTimers()` / `vi.setSystemTime()` for anything asserting on
  a TTL or a duration, and call `vi.useRealTimers()` afterwards.
- Derive an expected hash in the test rather than copying a literal, and assert the raw
  secret is *not* what got stored.
- Name tests for the behavior, not the function: "rejects an unauthenticated caller
  before touching the database", not "returns false".

### Type checking

`npm run build` only type-checks files reachable from the app's module graph, so it does
**not** cover test files. `npm run typecheck` (`tsc --noEmit`) covers the whole project.

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

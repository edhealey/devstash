# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links, and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

```bash
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint (flat config)
npm run typecheck  # tsc --noEmit (covers tests; `build` only checks the app graph)
npm test           # Vitest, single run
npm run test:watch # Vitest, watch mode
```

## Testing

Vitest, `node` environment. **Server actions and utilities only — no component tests.**

- Tests sit next to the code they cover: `src/lib/foo.ts` → `src/lib/foo.test.ts`.
- `vitest.config.ts` matches `src/**/*.test.ts` (`.ts` only — a component test would
  need `.tsx` plus a DOM environment, neither of which is configured).
- **No test may touch the database or the network.** Mock `@/lib/prisma` (and `@/auth`,
  `@/lib/email`, `bcryptjs` as needed) with `vi.mock`; declare the mock objects inside
  `vi.hoisted` since `vi.mock` factories are hoisted above the imports.
- See `context/coding-standards.md` for the full conventions.

## Neon MCP

When using Neon MCP tools for this project, ALWAYS target:

- **Project:** `devstash` — `flat-pine-29089439`
- **Branch:** `development` — `br-soft-voice-admxcdl2` (pass as `branchId`)

Rules:

- Default every Neon query/operation to the **development** branch. Always pass
  `branchId: br-soft-voice-admxcdl2` explicitly — do not rely on the default branch,
  which is production.
- **NEVER** touch the `production` branch (`br-snowy-moon-admkpl1o`) unless I
  explicitly name production in my request. This includes reads.
- If a request would hit production and I haven't said so, stop and ask first.
- Never run destructive SQL (DROP, DELETE, TRUNCATE, UPDATE/INSERT without an
  explicit go-ahead) on any branch.

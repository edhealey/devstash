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
npm run dev     # start dev server at http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint (flat config)
```

There is no test setup in this project yet.

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

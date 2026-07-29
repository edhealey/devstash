# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
4. **Unit test** - Write/update unit tests for any server action or utility the feature
   touches, then run `npm test`. Components are not unit tested — see [Testing](#testing)
5. **Verify** - Verify it works in the browser. Run `npm run build`, `npm run lint` and
   `npm run typecheck`, and fix any errors
6. **Iterate** - Iterate and change things if needed
7. **Commit** - Only after tests and build pass and everything works
8. **Merge** - Merge to main
9. **Delete Branch** - Delete branch after merge
10. **Review** - Review AI-generated code periodically and on demand.
11. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the tests and the build pass. If either fails,
fix the issues first.

## Testing

Vitest, `node` environment. Scope is deliberately narrow: **server actions and utilities
only — no component tests.** Full conventions live in @context/coding-standards.md.

- Test what has logic: branching, validation, security decisions, pure transforms. A
  function that only forwards to Prisma or Resend is not worth a test.
- Never reach the database or the network from a test — mock `@/lib/prisma` and friends.
- Don't write tests that restate the implementation. A test should fail if the behavior
  regresses; if it can't fail, it isn't earning its place.
- When a bug is fixed, add the test that would have caught it.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)

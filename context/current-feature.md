# Current Feature

Dashboard UI Phase 1

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Phase 1 of 3 for the dashboard UI layout. Build the foundational layout using
`@context/screenshots/dashboard-ui-main.png` as a visual reference.

- ShadCN UI initialization and component installation
- Dashboard route at `/dashboard`
- Main dashboard layout and any global styles
- Dark mode by default
- Top bar with search and new item button (display only)
- Placeholder sidebar and main area — just an `h2` with "Sidebar" and "Main" for now

## Notes

References: `@context/features/dashboard-phase-1-spec.md`,
`@context/screenshots/dashboard-ui-main.png`, `@src/lib/mock-data.ts`.
Later phases: `@context/features/dashboard-phase-2-spec.md`,
`@context/features/dashboard-phase-3-spec.md`.

<!-- Any extra notes -->

### Git History

- `5410ad6` — Initial commit from Create Next App
- `674c48b` — changes before building devstash

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Dashboard UI Phase 1 — ShadCN init (radix / Nova preset), `/dashboard` route with
  layout shell, dark mode by default, top bar (search + New Collection / New Item,
  display only), placeholder Sidebar and Main. Build passes; verified in browser.

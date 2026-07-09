# Current Feature

<!-- Feature name -->

Dashboard UI Phase 3 — Main Area

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Phase 3 of 3 for the dashboard UI layout. Build the main content area to the right of
the sidebar. Use the mock data from `@src/lib/mock-data.js` (import directly until the
database is implemented). Reference `@context/screenshots/dashboard-ui-main.png` for
layout.

Requirements:

- Main area to the right of the sidebar
- Recent collections
- Pinned items
- 10 recent items
- 4 stats cards at the top: number of items, collections, favorite items, and favorite
  collections (not in screenshot)

References:

- @context/features/dashboard-phase-3-spec.md
- @context/screenshots/dashboard-ui-main.png
- @src/lib/mock-data.js
- @context/features/dashboard-phase-1-spec.md
- @context/features/dashboard-phase-2-spec.md

## Notes

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

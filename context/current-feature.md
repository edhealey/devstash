# Current Feature

<!-- Feature name -->

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

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

---
name: web-design
description: Design reference for the o!TR website (apps/web). Use whenever you build, change, or review anything a visitor or admin sees in apps/web, such as a page, component, chart, table, form, dialog, badge, colour, or wording on screen. Covers the shared component library, its rules, screenshots in light and dark, do and don't examples, and how to keep this reference current.
---

# o!TR web design

The website has one design system: the component library under
`apps/web/components/kit/` and its helpers under `apps/web/lib/kit/`. It grew
out of the beatmap pages, which are the visual reference. Build every new or
changed screen from it, and never copy markup from a page that predates it.

## Before you start

1. Read the rules below.
2. Open the reference file for each area you touch (see "Where things are").
   Each component section has a screenshot in light and dark, the import, a
   usage example, its props, and do and don't bullets, including the legacy
   pattern it replaces.
3. To see a component live, sign in as an admin on your stack and open
   `/admin/design`. Every specimen has an anchor, for example
   `/admin/design#status-verification-icon`.

If the library has no component for what you need, build it in the library
(with a gallery specimen and a reference section), not inside the page.

## Rules

- **Page anatomy.** A page is a `PageFrame` holding a `PageHeader` (list and
  tool pages) or a `DetailHero` with tabs (detail pages), then panels. A
  panel holds a `SectionHeader` (or, for a list, its `ListToolbar`) and then
  rows, tiles, a table or a chart. Never put a panel or card inside a panel.
- **Spacing.** 16px between panels at every width, 16px panel padding, 12px
  panel and dialog corners, 8px tile and input corners, 24px dialog padding,
  16px side margin on phones.
- **Type.** Page title 30px bold, section title 16px semibold, row title
  16px medium, body 14px, labels 12px muted. Inter everywhere. Sentence case
  everywhere, including buttons, dialogs, menus and status names. Never
  `uppercase`, never `tracking-wide`, never smaller than `text-xs`.
- **Colour.** Semantic tokens only; no hex values or palette classes such as
  `text-orange-500`. Blue (`primary`) only for things you can act on or that
  are selected; section icons are muted. Status tokens colour fills, borders
  and icons; their `*-foreground` tokens colour text.
- **Status.** The glyph shows the outcome and a dashed outline means an
  automated check: Verified, Pre-verified, Pending, Pre-rejected, Rejected.
  Colour only reinforces. Pending, Pre-verified and Pre-rejected are "Not in
  ratings yet" everywhere, including charts.
- **Charts.** A fixed categorical palette for neutral series, rank ranges
  and teams. Mods, tiers, grades, verification status and star rating keep
  their own palettes. One tick rule, at most six ticks. Counts get thousands
  separators; years and IDs never do.
- **Lists.** One toolbar inside the list's panel. Every control that changes
  what a list shows lives in the page address. Filters apply as you change
  them; "Clear all" clears filters only. Numbered pages inside the panel for
  searchable lists, "Load more" only for activity feeds, never a silent cap.
- **Tables and rows.** Muted 12px headers, right-aligned numbers, an em dash
  for missing values, no zebra stripes, no second frame. On phones, tables
  become rows that keep the key number visible; nothing scrolls sideways.
  Names link. Only rows that already open as a whole get a hover tint. Reports
  open in a modal from a labelled "View" button.
- **Feedback.** One empty state, the shared section error with "Try again",
  skeletons shaped like the page, one callout with info, warning and danger
  tones.
- **Controls.** Three button sizes. Icon-only buttons always have an
  accessible name and a tooltip. Red only for destructive actions, solid red
  only in the final confirm. One dialog layout. Admin actions sit in one
  "Admin" menu per hero and an overflow menu per row.
- **Help.** One info button, a circled "i", that opens on tap, hover and
  keyboard focus. Anything that only opens on hover is a bug.
- **Formatting.** Dates "Jul 20 – Aug 3, 2024", timestamps "Jul 20, 2024,
  15:42 UTC", relative time only in feeds. Ranks "#1,234". Rating changes
  with one decimal. Rulesets osu!, taiko, catch, mania 4K, mania 7K. Never
  format with the visitor's locale or time zone.
- **Accessibility.** Keyboard reachable, visible focus, status never by
  colour alone, text at 4.5:1 and marks at 3:1 in both themes.

## Where things are

| You are building                                 | Read                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| A page frame, header, hero, tabs, panel, tiles   | [reference/layout.md](reference/layout.md)     |
| Verification status, badges, notification dots   | [reference/status.md](reference/status.md)     |
| Colour tokens, palettes, charts                  | [reference/color.md](reference/color.md)       |
| A list toolbar, search, sort, filters, URL state | [reference/lists.md](reference/lists.md)       |
| A table, phone rows, row links, paging           | [reference/tables.md](reference/tables.md)     |
| Empty, error and loading states, callouts, 404   | [reference/feedback.md](reference/feedback.md) |
| Buttons, admin menus, dialogs, forms             | [reference/controls.md](reference/controls.md) |
| Dates, numbers, ruleset and field names, mods    | [reference/format.md](reference/format.md)     |

Screenshots live in `images/`, one per gallery specimen, named after its
anchor. Each shows the light theme on the left and dark on the right.

## Keeping this reference current

This skill is only useful while it matches the code. In the same pull
request that changes a shared component, token or pattern:

1. Update the component's section in the reference file: props, variants,
   do and don't, and the import if it moved.
2. Update or add its gallery specimen in
   `apps/web/app/admin/design/sections/`.
3. Retake its screenshot. With your stack running (`apps/scripts/otr up`),
   run `node .claude/skills/web-design/scripts/capture-specimens.mjs
.claude/skills/web-design/images --only <specimen-id>` from the
   repository root.

When you notice that any part of this skill no longer matches the site, fix
that part, even when it is outside your task. When a page still uses a
legacy pattern listed here, move it onto the library when you next work on
that page.

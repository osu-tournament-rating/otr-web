---
name: otr-design-system
description: The o!TR visual system for otr-web. The beatmaps pages are the canonical reference. Token catalogue, pattern kit with file paths, chart rules, state rules, and responsive rules. Read before you design, build, or review rendered UI.
---

# o!TR design system

## 1. Reference

The beatmaps pages define the system: `apps/web/app/beatmaps/page.tsx`,
`apps/web/app/beatmaps/[id]/page.tsx`, `apps/web/components/beatmap/`, and
`apps/web/components/beatmaps/`. Raise every other page to this reference. Read the code
for the rules. Read the preview deployment for the render. Do not bundle screenshots.

## 2. Page shell and bands

Card shell, from `SectionCard` in `apps/web/components/beatmap/BeatmapSection.tsx` and
repeated at `apps/web/app/beatmaps/page.tsx:91`:

```
overflow-clip rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none
```

Bands inside the shell:

- Chrome band `bg-muted/20 ... dark:bg-muted`: the toolbar
  (`components/beatmaps/list/BeatmapListContent.tsx:76`) and the pagination
  (`app/beatmaps/page.tsx:131`).
- Content band `bg-muted/10 dark:bg-background/20`
  (`components/beatmaps/list/BeatmapListCards.tsx:45`).
- Group header band `border-b bg-muted/40 ... dark:bg-background/25` (`GroupHeader`,
  `components/beatmap/BeatmapOverviewCard.tsx:63`).
- Section header band `border-b px-4 py-3`, from `SectionHeader`.

Page header (`app/beatmaps/page.tsx:76`): a `header` with `mb-6 border-b pb-6`, an icon
at `size-7 text-primary`, an `h1` at `text-2xl font-bold tracking-tight sm:text-3xl`,
and one description at `mt-3 text-sm text-muted-foreground sm:text-base`.

Detail header (`components/beatmap/BeatmapHeader.tsx`): an artwork strip
(`group relative isolate h-48 overflow-hidden bg-muted sm:h-56`), a `bg-black/60` matte,
the `BeatmapBannerData` matte (`bg-card`), and the `DifficultyNavigator` rail of
difficulty links grouped by ruleset.

## 3. Hierarchy ladder

Radius: card `rounded-xl` > tile `rounded-lg` > badge `rounded-md` > pill
`rounded-full`.

Type: title `text-base sm:text-lg font-semibold`; large value
`text-xl font-bold leading-none` (`TileStat`); body `text-sm`; meta and eyebrow
`text-xs font-medium text-muted-foreground` (`Eyebrow`). `text-xs` is the floor. See the
`Typography` section of `AGENTS.md`.

`font-variant-numeric: tabular-nums` applies to `body` (`app/globals.css:14`). Add
`tabular-nums` again only where a utility or a primitive resets it.

## 4. Pattern kit, by file

From `components/beatmap/BeatmapSection.tsx`:

- `SectionCard` — card chrome; `as="header"` for the page header.
- `SectionHeader` — icon, title, optional `infoText` tooltip, optional `meta`.
- `Tile` — `rounded-lg border bg-muted/25 px-3 py-2.5`; `TileStat` puts an icon and
  label over a large value inside it.
- `Eyebrow` — small muted caption for column and group labels. `Swatch` — 8px color
  chip before a mod, grade, or rank-bracket label.
- `EmptyState` — in-card empty copy; default text `Not enough data`.
- `BoxPlotTrack`, `BoxPlotTooltipContent`, `ScaleAxis`, `FullRangeToggle` — the box plot
  row, its five-number readout, its axis, and its range toggle.

Elsewhere:

- `BeatmapMetric` (`components/beatmaps/BeatmapMetric.tsx`) — the icon and value pair
  for every inline beatmap statistic.
- `beatmapPillVariants` (`components/beatmaps/pill.ts`) — sizes `sm` and `md`, tones
  `plain`, `surface`, `overlay`. `StarRatingPill`, `RulesetPill`, and `BeatmapTopMods`
  build on it.
- `BeatmapEmptyState` — page-level empty block: icon, title, body, action.
- `BeatmapCover` — remote cover art with a local fallback image.
- `components/filters/` — `FilterChip`, `FilterPopover`, `FilterRangeField`,
  `useDeferredFilterApply`. Slider scales live in `lib/filters/scale.ts`.
- `TapTooltip` (`components/tap-tooltip.tsx`) — use it for icon-only triggers and chart
  triggers. It renders its own focusable button, so a pointer user hovers and a keyboard
  or touch user pins the same content.
- `SimpleTooltip` (`components/simple-tooltip.tsx`) — use it only around a child that is
  already focusable. An icon-only `SimpleTooltip` is unreachable by keyboard and touch
  (GitHub issue 858).
- `components/badges/` — `VerificationBadge` (sizes `pip`, `xsmall`, `small`, `large`),
  `UnverifiedDataBadge`, `LazerBadge`. `components/icons/` — `RulesetIcon`,
  `ModIconset`, `SingleModIcon`, `TierIcon`.
- `components/beatmaps/list/` — the `BeatmapListFilter` toolbar, the `cards` / `compact`
  / `table` toggle with `BEATMAP_CARD_GRID_CLASS` in `layout.ts`, and
  `BeatmapSelectionBar`.
- `lib/utils/table.ts` — `stickyTableHeader`, `stickyTableHeaderFromLg`, and
  `stickyTableHeaderInScrollArea`.

## 5. Token catalogue

All tokens live in `apps/web/app/globals.css`.

- Semantic set: `background`, `foreground`, `card`, `popover`, `muted`, `primary`,
  `secondary`, `accent`, `border`, `input`, `ring`, `sidebar-*`, `card-alt*`, and their
  `*-foreground` partners.
- Status set: `success`, `warning`, `destructive`. The base token is the vivid role for
  fills, tints, borders, and icons. The `*-foreground` token is the readable text role.
  Read the `Tailwind` section of `AGENTS.md` before you put a label on a status fill.
- Charts: `--chart-1` to `--chart-5`. Verification statuses: `--color-status-` plus
  `pending`, `awaiting`, `rejected`, `verified`.
- Mods: `--mod-*`, one per mod and per common combination. Grades: `--grade-` plus
  `ss`, `s`, `a`, `b`, `c`, `d`.
- Rank ranges: `--rank-range-` plus `open`, `lt1k`, `1k`, `10k`, `100k`.
- Tiers: `--text-elite-grandmaster` through `--text-bronze`, with matching
  `.text-<tier>` utilities.
- Teams: `--team-red`, `--team-blue`, `--team-no-team`, read by `.team-container` with
  `--score-performance-label`. Layout: `--header-height-px`, read by the sticky headers.

Derived colors: `lib/beatmaps/star-rating-color.ts` (`getStarRatingColor`,
`getStarRatingIconColor`, `getStarRatingForegroundColor`); `lib/utils/mods.ts`
(`getModColor`, `getModForegroundColor`); `lib/beatmaps/rankRange.ts`
(`RANK_RANGE_BUCKETS`, which pairs each color with a symbol and a dash).

Color has three sources:

1. Chrome and text use the semantic tokens.
2. Data encodings use the domain palettes, through an inline `style` or the matching
   utility class. Never use a Tailwind palette class for an encoding.
3. Type on an image overlay uses `text-white/85` on a `bg-black/60` matte
   (`components/beatmap/BeatmapHeader.tsx:67` and `:90`).

## 6. Icon vocabulary

One Lucide icon per concept, at `size-4 shrink-0` and `aria-hidden`. Small inline icons
use `size-3.5`.

- Data: `Activity` BPM, `Clock3` length, `Gamepad2` games, `Trophy` tournaments and pick
  rate, `WavesLadder` mappool membership, `CalendarRange` active quarters, `Music2`
  artist, `UserRound` mapper, `Layers` mods, `Star` star rating.
- Sections: `Gauge` overview, `SlidersHorizontal` attributes, `TrendingUp` tournament
  activity, `ListFilter` distributions, `ChartCandlestick` score distribution,
  `ChartScatter` score scatter, `Swords` closeness and margin, `Target` performance,
  `Medal` leaderboard and tiers.
- Controls and states: `Info` explanation, `PencilLine` admin override, `ExternalLink`
  osu! link, `SearchX` page empty, `Inbox` no verified data, `ImageOff` missing cover,
  `Search`, `Filter`, `X`, `LayoutGrid`, `Rows3`, `Table2`, and the `Arrow*` sort set.

Ruleset, mod, grade, and tier glyphs come from `components/icons/` and the SVG sets
under `public/icons/rulesets/`, `.../mods/`, `.../grades/`, `.../tiers/`.

## 7. Charts

Build every chart on the shadcn wrapper `components/ui/chart.tsx` (`ChartContainer`,
`ChartTooltip`, `ChartTooltipContent`), not on bare Recharts.

- Set `isAnimationActive={false}` on every series, `tickLine={false}` and
  `axisLine={false}` on every axis, and `<CartesianGrid strokeDasharray="3 3" />` with
  `vertical={false}` for a category axis.
- Style an axis label `fill: 'var(--muted-foreground)'`, `fontSize: 12`, `fontWeight: 500`.
- Fix the container height, for example `aspect-auto h-[300px] w-full`
  (`BeatmapScoreScatterCard.tsx:419`) or `h-[240px] w-full`
  (`BeatmapScoreDistributionCard.tsx:120`). Keep the empty branch at that height.
- Thin ticks and marks below `sm` with `useIsNarrowChart` (`lib/hooks/useMediaQuery.ts`).
- Compute bounds with `getNiceAxis`, `getScatterAxis`, and `getScaleTicks`
  (`lib/beatmaps/chart-axis.ts`).
- Render a legend as `aria-pressed` toggle buttons that show and hide the series, each
  with a `Swatch` or a series glyph (`BeatmapScoreScatterCard.tsx:191`). Put a
  full-sentence description in an `sr-only` paragraph and in the chart `desc` prop.
- Lay tooltip rows out label-left and value-right, and put the sample size in the
  tooltip header (`BoxPlotTooltipContent`).
- Report hidden or clamped points in a `text-xs text-muted-foreground` footnote joined
  by the separator `" · "` (`BeatmapScoreScatterCard.tsx:571`).
- Carry each series with a symbol and a dash pattern as well as a color, so color stays
  redundant (`RANK_RANGE_BUCKETS`).

## 8. Numbers and copy

- Give every count a unit or an `x of y` sample, for example `12,043 of 41,900 scores`.
- Format with the shared helpers: `formatChartNumber`, `formatPercentage`, `formatKilo`,
  `formatRating`, `formatDecimal` (`lib/utils/chart.ts`); `formatDuration`
  (`lib/utils/date.ts`); `formatAccuracy` (`lib/utils/format.ts`); `formatRankRange`
  (`lib/utils/number.ts`); `formatSecondsToMinutesSeconds` (`@otr/core/utils/time`).
- Write labels and captions in sentence case. Name the real condition in an empty
  state: verified data with no statistics says that statistics are still being
  generated, and only unverified data is called unverified.
- Make an accessible name a full sentence that restates the visible value, for example
  `Pooled in 12 tournaments, 9 of them verified`.

## 9. States

- Page empty: `BeatmapEmptyState`. The copy changes with the filter state, and the
  filtered state adds a `Clear filters` action
  (`components/beatmaps/list/BeatmapListGrid.tsx:36`).
- Card empty: `EmptyState` inside the card, at the chart's height. No verified data:
  the band at `app/beatmaps/[id]/page.tsx:100`, which keeps the header and the overview
  card and replaces the rest.
- Error: `app/beatmaps/error.tsx` — icon medallion, heading, body, `Try again` button.
- Loading: `app/beatmaps/loading.tsx`, which imports `BEATMAP_CARD_GRID_CLASS` so the
  skeleton uses the real layout constant.

## 10. Responsive

- Breakpoints in use: `sm`, `md`, `lg`. The table layout renders `BeatmapListTable` at
  `sm` and above and `BeatmapListRows` below it (`BeatmapListGrid.tsx:74`).
- Pagination hides the numbered items below `sm` and shows a `current / total` status
  instead (`app/beatmaps/page.tsx:167`).
- The toolbar stacks as a grid and becomes a flex row at `md`
  (`BeatmapListFilter.tsx:405` and `:429`).
- Desktop ruleset chips are `hidden ... md:flex`, and the same options appear as a
  `chip-group` field with `className: 'md:hidden'` inside `FilterPopover`
  (`BeatmapListFilter.tsx:329` and `:530`).
- Use `TapTooltip` wherever a touch user needs the tooltip content, and add
  `text-balance` to a long display title (`BeatmapHeader.tsx:87`).

## 11. Motion

- Animate hover and focus transitions only, with `transition-colors` or `transition`.
- The detail cover scales on hover with `transition-transform duration-700` and
  `group-hover:scale-[1.0225]`.
- The selection bar enters with `animate-in fade-in slide-in-from-bottom-2`
  (`BeatmapSelectionBar.tsx:26`).
- Charts do not animate. Wait for `document.fonts.ready` before you measure or scroll
  to an element (`BeatmapHeader.tsx:185`).

## 12. Primitives

Never edit `components/ui/*`. Compose the primitive and restyle it at the call site for
state, size, and surface:

- Layout toggle item (`BeatmapListFilter.tsx:587`): `size-10`, corner radii on `first:`
  and `last:`, and a `data-[state=on]:bg-primary/10 data-[state=on]:text-primary`
  pressed tone with a `dark:` partner for each state.
- Search input (`:425`): `h-10 bg-background pr-3 pl-9` with `dark:bg-input/50` and
  `dark:shadow-none`.

An arbitrary value is correct where no utility exists: chart heights (`h-[300px]`),
aspect ratios (`aspect-[16/7]`), and grid templates (`grid-cols-[minmax(0,1fr)_auto]`).

Two rules from `AGENTS.md` apply to every overlay. Never set a `z-*` class on
`PopoverContent`, `DropdownMenuContent`, or `TooltipContent`. Wrap the tooltip around
`DialogTrigger`, never around `Dialog`.

## 13. Anti-patterns seen in agent pull requests

- A Tailwind palette class where a token exists.
  `components/tournaments/MatchLedgerRow.tsx:38` and `:40` tint a score with
  `text-red-600` and `text-blue-600` while `--team-red` and `--team-blue` exist.
- A control that does not sit level with its section header. Put it in the `meta` slot
  of `SectionHeader`.
- A bare `<p>` as an empty state. Use `EmptyState` or `BeatmapEmptyState`. An icon-only
  `SimpleTooltip`. Use `TapTooltip` (GitHub issue 858).
- A `Card` with `p-6` as a page shell. Use `SectionCard` and its bands.

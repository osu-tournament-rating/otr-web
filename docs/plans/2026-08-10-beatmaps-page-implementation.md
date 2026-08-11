# Beatmaps page review implementation

This plan implements the actionable findings of the 2026-08-10 multi-persona review of the beatmap detail page (`/beatmaps/[id]`, branch `feature/beatmap-redesign`). Source review: `docs/reviews/2026-08-10-beatmaps-page-review.md`. It was synthesized from four cluster specs (distributions/donut, pools/records/scores, analytics charts/touch layer, page-level concerns) and covers all 7 MUST items, all 11 SHOULD items, and every in-scope CONSIDER item. One CONSIDER item (touch-scroll tooltip dismissal) is deliberately skipped with justification — see the final "Deferred / flagged" section, which also carries every controller flag raised by the specs.

The work is organized into 9 self-contained tasks. Task 1 creates the shared tap/keyboard interaction primitives that Tasks 3, 6, and 7 consume. Tasks 2–3 both edit `BeatmapDistributionsCard.tsx` and must run in order. Tasks 4–5 both edit `BeatmapRecordsCard.tsx` and must run in order. Tasks 4, 6, and 8 each carry one disjoint edit to `apps/web/app/beatmaps/[id]/page.tsx` (prop additions must land atomically with the component that declares the prop, so they cannot be consolidated into one task without breaking per-task typechecking). Task 8's zero-data collapse changes what the empty fixture `/beatmaps/884085` renders, so it is ordered after every task that uses that fixture to verify per-card empty states. Line anchors cited in tasks were verified against the working tree on 2026-08-10; anchors in files touched by an earlier task of this plan may drift — treat them as approximate locators, not exact offsets.

## Global Constraints

**Locked design language.** Compose ONLY from existing shadcn primitives in `apps/web/components/ui` (`popover.tsx`, `tooltip.tsx`, `tabs.tsx`, `badge.tsx`, `button.tsx`, `table.tsx`, `skeleton.tsx`, etc.), Recharts, Tailwind semantic tokens from `apps/web/app/globals.css`, and Lucide icons. **Reinventing a `ui/` primitive is a critical regression.** Editing files under `apps/web/components/ui/` is forbidden. New _composition_ components (like the existing `apps/web/components/simple-tooltip.tsx`) and new hooks are allowed — they are not `ui/` primitives. Adding new CSS custom properties to `apps/web/app/globals.css` is allowed (it is the token file). Do NOT modify `apps/web/components/simple-tooltip.tsx` — it has ~30 consumers app-wide.

**No contract changes.** No data-semantics changes, no oRPC/schema/server contract changes, no DB/migration changes. Everything is layout, labeling, color tokens, and client interaction. These files are READ-ONLY: `apps/web/lib/orpc/schema/*`, `apps/web/lib/orpc/queries/*`, `apps/web/app/server/oRPC/*`.

**Explicitly OUT of scope** (flagged product decisions — do not implement even if tempting):

- freemod <5-score _hide_ threshold (the count-chips _presentation_ IS in scope)
- per-ruleset miss bucketing (the `5+` clamp is server-side `LEAST(stat_miss, 5)` — leave bucket labels alone)
- unifying the donut's two populations (slices = pools, hover = verified scores — deliberate; only labeling fixes are in scope)
- changing what the Games stat _counts_ (the label _qualifier_ IS in scope)
- exposing rejection reasons on empty pages
- per-ruleset rank-range bucket boundaries
- fixture swaps

**No commits, no pushes, no PRs** without explicit user instruction. New files need `git add -N <path>` so they appear in diffs.

**Verification commands** (run after each task, narrowest first):

- `bun test <touched test file>` — only for test files the task touches (e.g. `bun test apps/web/lib/beatmaps/__tests__/records.test.ts`)
- `bun run --filter web lint`
- `bunx tsc --noEmit`
- `bunx prettier --check <changed files>` (`bunx prettier --write` to fix)

**NEVER run `bun run build` and NEVER run the e2e suite.** E2E specs (`apps/web/e2e/beatmaps.e2e.ts`) get EDITED where a task says so, but are never executed.

**Visual verification.** A dev server is already running at `http://localhost:3000` — do NOT start or stop servers. Verify with Playwright MCP / browser screenshots at **1440x1000 and 390x844**. Fixtures:

- `/beatmaps/46827` — osu! flagship (data-rich, 822 verified scores, 50 pools)
- `/beatmaps/2901604` — taiko (freemod-heavy, 2 rank brackets)
- `/beatmaps/1530447` — catch populated (S-dominant grades, mass score ties)
- `/beatmaps/884085` — catch empty-state (0 pools, 0 verified scores; **after Task 8 this fixture renders the collapsed empty band — per-card empty-state checks against it are only valid in Tasks 2–7, i.e. before Task 8 lands**)
- `/beatmaps/2024439` — mania 4K
- `/beatmaps/869223` — mania 7K (sparse: 4 freemod scores, single rank bracket)

Light AND dark theme are both mandatory for any task that changes colors/tokens; a single dark spot-check is cheap insurance elsewhere. Two standing invariants to keep true at 390px even though the pinned e2e is never run: zero horizontal document overflow on the page, and no horizontal scroll inside the mod-distribution card.

---

## Task 1: Shared tap/keyboard primitives — TapTooltip and useMediaQuery

Touches shared files: none (two new files, no consumers yet).

### Files

- **CREATE** `apps/web/components/tap-tooltip.tsx`
- **CREATE** `apps/web/lib/hooks/useMediaQuery.ts`

### Requirements

1. `TapTooltip` is a composition component (NOT a `ui/` primitive): hover shows a Radix tooltip, click/tap/Enter pins the same content in a Radix popover, keyboard focus opens the tooltip, Escape closes the popover. The trigger is a real `<button>` with a visible focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none` — the recipe the scatter legend buttons already use). It composes only `ui/tooltip.tsx` + `ui/popover.tsx`; nothing in `ui/` is touched. This delivers review MUST 2's core pattern: works on every input type with no pointer detection, and tooltip + popover are never visible simultaneously.
2. `useMediaQuery` is an SSR-safe hook via `useSyncExternalStore` (server snapshot `false`). No such hook exists anywhere in `apps/web` (recon-verified) — this is new code, not a reinvention.
3. Both files compile standalone with no consumers.

### Approach

`apps/web/components/tap-tooltip.tsx` — exact content:

```tsx
'use client';

import { ReactNode, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TapTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
}

/**
 * Hover shows a tooltip; click/tap/Enter pins the same content in a popover.
 * The trigger is a real <button>, so keyboard focus opens the tooltip and
 * touch users get the depth layer hover-only tooltips deny them.
 */
export default function TapTooltip({
  content,
  children,
  side = 'bottom',
  align = 'center',
  triggerClassName,
}: TapTooltipProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Tooltip open={tooltipOpen && !popoverOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'block w-full rounded text-left',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                triggerClassName
              )}
            >
              {children}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
        >
          {content}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className="w-auto max-w-[calc(100vw-2rem)] p-3 text-xs"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
```

Notes: the controlled `open={tooltipOpen && !popoverOpen}` prevents tooltip+popover double-render on desktop click. `content` is rendered in both containers; only one is ever open. The tooltip keeps the app's `bg-accent` look; the popover uses standard `bg-popover border shadow-md` — both themed primitives, no new colors. The global `TooltipProvider delayDuration=0` is already mounted in `app/layout.tsx` (L52) — no local provider needed. `cn` is tailwind-merge-backed, so a `triggerClassName` like `flex w-auto ...` correctly overrides the base `block w-full`.

`apps/web/lib/hooks/useMediaQuery.ts` — exact content:

```ts
import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
```

### Test updates

None. No unit tests required for either file (trivial composition/hook; behavior is exercised by Tasks 3, 6, 7 visual verification).

### Verification

`git add -N apps/web/components/tap-tooltip.tsx apps/web/lib/hooks/useMediaQuery.ts`, then lint / `bunx tsc --noEmit` / prettier per Global Constraints. No visual check (no consumers yet).

---

## Task 2: Distributions card — retitle, per-dataset counts, legend counts, freemod ranked rows + chips, grade palette

Touches shared files: `apps/web/components/beatmap/BeatmapDistributionsCard.tsx` (Task 3 edits it next — run this task first), `apps/web/e2e/beatmaps.e2e.ts` (Tasks 5 and 6 add tests to it — disjoint edits), `apps/web/app/globals.css`.

### Files

- `apps/web/components/beatmap/BeatmapDistributionsCard.tsx` — edited
- `apps/web/app/globals.css` — edited (new grade tokens in `:root` and `.dark`)
- `apps/web/e2e/beatmaps.e2e.ts` — edited (one regex; NEVER run)

Key existing anatomy of `BeatmapDistributionsCard.tsx` (verified): L60–75 `toModSegments` (shared pipeline, `ModSegment { label, scoreCount, percentage, percentageLabel, fill }`); L81–117 `summarizeRankRangeMods` — **exported; the unit test imports it from this file (test line 4); keep the export name and location**; L123–134 `GRADE_GROUPS`; L177–207 `SegmentBar`; L209–236 `SegmentLegend`; L484–621 card body (`SectionHeader` + meta L489–497, mod bar panel L503–512, grades panel L516–534, freemod panel L536–568, rank-range panel L571–616).

### Requirements

1. **(SHOULD 1) Retitle the card to `Distributions`.** `SectionHeader` at L491: `title="Mod distribution"` → `title="Distributions"`. Keep icon `ListFilter`. ("Distributions" chosen over "At a glance": the review notes the component is literally named BeatmapDistributionsCard and the title should match.) Do NOT change `data-testid="beatmap-mod-distribution-chart"` (load-bearing in e2e:1656, 1681, 1703, 1741, 1778).
2. **(SHOULD 1) Move the score total beside the mod bar.** Remove the `meta` prop from `SectionHeader`. Give the top mod-bar panel a header row: an `Eyebrow` reading exactly `Mod distribution`, and a right-aligned meta span whose text is exactly `` `${formatChartNumber(totalScoreCount)} scores` `` (e.g. `822 scores`). **The `{n} scores` string format is load-bearing**: e2e:1683 matches `/^[\d,]+ scores$/` inside the card, and e2e:1674–1694 requires it to equal the Scores-tab count string verbatim. No qualifier words.
3. The freemod caption `` `{n} scores in {m} freemod games` `` stays beside the freemod dataset, format unchanged (already satisfied — keep).
4. **(CONSIDER: legend counts) Add counts to `SegmentLegend` entries** so mod and grade legends read `DT 29.3% · 241`: label span, then one mono span with `` `${segment.percentageLabel} · ${formatChartNumber(segment.scoreCount)}` ``. Make `scoreCount: number` a required field of `DisplaySegment` (L169–174; both mod and grade segments already carry it). Keep `ariaLabel="Mod distribution"` on the mod legend exactly (e2e:1663, 1705 locate the list by that name) and `ariaLabel="Grade distribution"` on the grades legend.
5. **(MUST 3) Replace the freemod `SegmentBar` + `SegmentLegend` with ranked per-mod rows.** Structurally distinct from the stacked bars; keeps the shared mod palette (`segment.fill` from the same `toModSegments` pipeline — do NOT recolor); rows arrive sorted by score count desc — render in that order. Each row: swatch + mod label, a bar-in-row track (echoing the pool rows' games-bar pattern), and a right-aligned `{percentage} · {count}` value.
6. **(MUST 3) Plain-language lead-in**, exact copy verbatim: `When players could choose their mod, they picked:` — a `text-xs text-muted-foreground` line above the rows (and above the chips in req 7), only when `freemodGameCount > 0` and segments exist.
7. **(CONSIDER: small-sample fallback) When `freemodPicks.freemodScoreCount < 5`, render count chips instead of percent rows.** Chips show label + raw count, no percentages (mania 7K fixture: `NM 2`, `FL 1`, `HD 1`). Use shadcn `Badge` (`@/components/ui/badge`), `variant="outline"`, mod swatch inside. This shows ALL data — it is the layout-safe presentation, NOT the flagged hide-threshold.
8. Empty-state strings unchanged: `No freemod games recorded.` / `No verified scores in freemod games yet.` / `No mod data available.` / `No grade data recorded for these scores.`
9. Zero horizontal overflow in the card at 390px (e2e:1770–1786 asserts `scrollWidth - clientWidth <= 0`).
10. **(MUST 6) Recolor the grades bar: game-canonical SS/S/A + monotonic muted B–D.** SS magenta `#DE31AE`, S teal `#02B5C3`, A green `#88DA20` — the top-layer pill fills of `apps/web/public/icons/grades/{SS,S,A}.svg` (osu-web score-ranks-v2019), which the Scores-tab badges already use. Do not touch the SVGs. B–D become an achromatic ramp, monotonic in lightness in BOTH themes, every step visible against the card surface (light card ≈ oklch 0.98; dark card ≈ oklch 0.24). Resolution of the review's "align whole bar with badges" vs the catch/mania amendments: canonical hues for SS/S/A only, muted grays for B–D (the review's H2 verdict endorses this).
11. New colors are tokens, not hardcoded hex in TSX — fills stay `var(--grade-*)`. Do NOT reuse `--chart-3/4/5` (not theme-aware; they invert perceptually in dark mode).
12. **(MUST 6) Verify A-green is distinguishable from EZ-green** (`--mod-easy: hsl(114, 86%, 69%)`) in the adjacent mod bars, both themes. `#88DA20` ≈ hue 85 saturated yellow-green vs EZ's pastel hue-114 — expected distinct. If they read the same, darken `--grade-a` toward `#7CCE14` (the SVG under-layer); do NOT move toward hue 114–151 (collides with EZ / `--mod-half-time` / `--rank-range-1k` / `--text-emerald`).

### Approach

**Header + mod panel** (replaces L489–512):

```tsx
<SectionHeader icon={ListFilter} title="Distributions" />
...
<div className="space-y-3 px-4 py-4">
  <div className="flex items-baseline justify-between gap-2">
    <Eyebrow>Mod distribution</Eyebrow>
    <span className="font-mono text-xs text-muted-foreground tabular-nums">
      {`${formatChartNumber(totalScoreCount)} scores`}
    </span>
  </div>
  <SegmentBar segments={modSegments} testId="beatmap-mod-distribution-bar" />
  <SegmentLegend segments={modSegments} ariaLabel="Mod distribution" />
</div>
```

**SegmentLegend value span** (replaces L229–231):

```tsx
<span className="font-mono text-muted-foreground tabular-nums">
  {`${segment.percentageLabel} · ${formatChartNumber(segment.scoreCount)}`}
</span>
```

Add `scoreCount: number` to `DisplaySegment` (L169–174); `buildGradeSegments` already emits it.

**Freemod rows** — new module-level component in the same file (card-local composition, not a `ui/` primitive):

```tsx
function FreemodPickRows({ segments }: { segments: ModSegment[] }) {
  const maxPercentage = Math.max(...segments.map((s) => s.percentage));
  return (
    <ul aria-label="Freemod mod picks" className="space-y-1.5">
      {segments.map((segment) => (
        <li key={segment.label} className="flex min-h-5 items-center gap-2">
          <span className="flex w-16 shrink-0 items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: segment.fill }}
              aria-hidden="true"
            />
            <span className="truncate text-xs font-medium">
              {segment.label}
            </span>
          </span>
          <span
            className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${maxPercentage > 0 ? (segment.percentage / maxPercentage) * 100 : 0}%`,
                minWidth: segment.percentage > 0 ? 2 : 0,
                backgroundColor: segment.fill,
              }}
            />
          </span>
          <span className="w-24 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
            {`${segment.percentageLabel} · ${formatChartNumber(segment.scoreCount)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

Bars scale relative to the top pick (top row = full track width), matching the pool-row max-scaled pattern; the absolute share rides in the printed percentage.

**Freemod chips** — same file:

```tsx
import { Badge } from '@/components/ui/badge';

function FreemodPickChips({ segments }: { segments: ModSegment[] }) {
  return (
    <ul aria-label="Freemod mod picks" className="flex flex-wrap gap-1.5">
      {segments.map((segment) => (
        <li key={segment.label}>
          <Badge variant="outline" className="gap-1.5 font-mono tabular-nums">
            <span
              className="size-2 rounded-[2px]"
              style={{ backgroundColor: segment.fill }}
              aria-hidden="true"
            />
            {`${segment.label} ${formatChartNumber(segment.scoreCount)}`}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
```

**Freemod panel body** (replaces L556–567):

```tsx
) : (
  <>
    <p className="text-xs text-muted-foreground">
      When players could choose their mod, they picked:
    </p>
    {freemodPicks.freemodScoreCount < 5 ? (
      <FreemodPickChips segments={freemodSegments} />
    ) : (
      <FreemodPickRows segments={freemodSegments} />
    )}
  </>
)}
```

Delete the `testId="beatmap-freemod-picks-bar"` SegmentBar usage — verified zero e2e/unit references to that testid.

**`apps/web/app/globals.css`** — append to the `:root` block after `--mod-touch-device` (~L266):

```css
/* Grade bar colors. SS/S/A match the canonical osu! grade badges
   (public/icons/grades/*.svg) so the bar agrees with the Scores tab;
   B-D are a monotonic muted ramp, flipped per theme so worse grades
   always recede toward the card background. */
--grade-ss: #de31ae;
--grade-s: #02b5c3;
--grade-a: #88da20;
--grade-b: oklch(0.45 0 0);
--grade-c: oklch(0.6 0 0);
--grade-d: oklch(0.75 0 0);
```

In the `.dark` block (starts L268):

```css
--grade-b: oklch(0.85 0 0);
--grade-c: oklch(0.7 0 0);
--grade-d: oklch(0.55 0 0);
```

**`GRADE_GROUPS`** (L123–134) — fills only; labels/grades/order untouched:

```tsx
{ label: 'SS', grades: [ScoreGrade.SSH, ScoreGrade.SS], fill: 'var(--grade-ss)' },
{ label: 'S',  grades: [ScoreGrade.SH, ScoreGrade.S],   fill: 'var(--grade-s)' },
{ label: 'A',  grades: [ScoreGrade.A],                  fill: 'var(--grade-a)' },
{ label: 'B',  grades: [ScoreGrade.B],                  fill: 'var(--grade-b)' },
{ label: 'C',  grades: [ScoreGrade.C],                  fill: 'var(--grade-c)' },
{ label: 'D',  grades: [ScoreGrade.D],                  fill: 'var(--grade-d)' },
```

### Test updates

- `apps/web/e2e/beatmaps.e2e.ts` test `'only breaks out mods played in at least 1% of scores'` (L1696–1732): the legend regex at L1712 no longer matches `DT 29.3% · 241`. Change to:
  ```ts
  entry.replace(/\s+/g, ' ').match(/^(.+?) ([\d.]+)% · [\d,]+$/) ?? [];
  ```
  All other assertions in that test stand unchanged.
- These must keep passing conceptually (do not edit): e2e:1650–1672 (card testid + legend list name + bar/legend count parity); e2e:1674–1694 (score-total parity — the `{n} scores` string moved but stays inside the card locator with identical format; nothing else in the card matches the anchored regex); e2e:1734–1786 (geometry + mobile overflow). No e2e/unit test asserts grade colors or the `beatmap-grade-distribution-bar` testid.
- Unit test `apps/web/components/beatmap/__tests__/BeatmapDistributionsCard.test.ts`: no assertions break; do not move or rename the `summarizeRankRangeMods` export.

### Verification

Commands per Global Constraints. Visual, **light AND dark both mandatory** (color change), 1440x1000 + 390x844:

- `/beatmaps/46827`: card titled "Distributions"; `822 scores` sits right of the "Mod distribution" eyebrow and nowhere in the card header; mod + grade legends read `LABEL N% · COUNT`; freemod panel shows the lead-in and ranked rows (top row HR at full track width); grades bar: A unmistakable green, S teal, C clearly visible on the light card, B→C→D an ordered fade, legend swatches match segments; compare A-green vs any EZ segment and SS-magenta vs any HDHR pink segment; no horizontal scroll at 390px.
- `/beatmaps/869223`: chips `NM 2`, `FL 1`, `HD 1` instead of percent rows; lead-in present.
- `/beatmaps/2901604`: rows render, HD-led, visually distinct from the stacked mod bar above.
- `/beatmaps/1530447`: dominant S mass reads calm teal, not alarm-red. `/beatmaps/2024439`: small A sliver visibly green against the teal mass.
- `/beatmaps/884085`: card still renders `No mod data available.` (valid check pre-Task-8).
- Scores tab on 46827: bar colors now rhyme with the grade badge chips.

---

## Task 3: Donut interaction layer — drop the morph, label + offset the tooltip, hint copy, single-bracket collapse, gloss, tappable legend

Touches shared files: `apps/web/components/beatmap/BeatmapDistributionsCard.tsx` (run AFTER Task 2). Consumes `TapTooltip` from Task 1.

### Files

- `apps/web/components/beatmap/BeatmapDistributionsCard.tsx` — edited (only file)

Anatomy (pre-Task-2 anchors, approximate after it): `RankRangePie` L250–430 — center label `renderCenterLabel` L259–291, morph `renderActiveSlice` L293–356, `ChartTooltip` L376–426; rank-range panel L571–616 (`data-testid="beatmap-rank-range"`, header meta `{n} pools` L577–579, legend L593–610, hint L611–613).

### Requirements

1. **(MUST 4) Drop the slice-repaint morph.** `renderActiveSlice` loses the per-mod sub-`Sector` branch entirely and always renders one plain `Sector` grown to `outerRadius + 4` in the slice's own fill. Grow-on-hover + tooltip remain the single mod-disclosure channel. (Review basis: repaint + tooltip double-encode; the morph's mod palette collides with the rank-range legend.)
2. **(MUST 4) Label tooltip counts as verified scores.** Under the existing `{label} · {n} pools` header line, add a sub-caption, exact copy: `Mods in {n} verified scores` where `{n}` = `bucketMods.scoreCount` (already plumbed; format with `formatChartNumber`). When the bracket has pools but no verified scores (`bucketMods` undefined — server omits zero-score buckets), the sub-caption reads exactly: `No verified scores in this bracket`. Per-mod rows keep their `{pct} · {count}` format.
3. **(MUST 4) Offset the tooltip off the ring and shrink it.** `ChartTooltip` gains `offset={24}`, `allowEscapeViewBox={{ x: true, y: true }}`, `wrapperStyle={{ zIndex: 30 }}` (Recharts 3 supports all). Cap mod rows at the **top 5**; when more exist, one final muted row: `+{k} more` left, summed percentage (`formatPercentage(sum, 1)`) right, no swatch. Acceptance: at 1440px, hovering the largest slice on `/beatmaps/46827`, the tooltip must NOT cover the donut's center pool-count label. (Fallback if occlusion persists: fixed `position={{ y: 208 }}` parking the tooltip below the chart — see Deferred / flagged, Flag D1.)
4. **(MUST 2, donut part) Hint copy** becomes exactly: `Hover or tap a slice to see mods within that bracket`; class bumps `text-[10px]` → `text-xs`.
5. **(SHOULD 7) Single-bracket collapse.** When `rankSlices.length === 1`, render a compact stat line instead of donut + legend + hint, exact copy: `All {n} pools · {label} rank` (e.g. `All 3 pools · Open rank`), degrading to `1 pool · {label} rank` when the count is 1. Bucket swatch included. Donut + hover stay whenever 2+ brackets exist.
6. **(SHOULD 11) Gloss "Rank range".** Under the `Rank range` eyebrow, a permanent (not hover-gated) line, exact copy: `Tournament registration floor` — `text-xs text-muted-foreground`. Visible in all three panel states (donut, collapsed stat line, `Never pooled by a tournament.`).
7. **(CONSIDER) Remove the `{n} pools` meta span** from the rank-range panel header row. The donut center (or the stat line in collapse mode) is the single remaining count.
8. **(CONSIDER: legend-hover slice activation, adapted) Each donut legend row becomes hover/tap/focus-inspectable** via `TapTooltip` (from `@/components/tap-tooltip`, Task 1) whose content is the SAME tooltip body the chart tooltip renders (shared component, reqs 2–3 formatting). This makes one-pool sliver brackets inspectable regardless of slice size, on hover, keyboard focus, AND tap (synthesis decision: TapTooltip instead of the spec's SimpleTooltip variant, so touch users get legend access too — see Deferred / flagged, Flag D2). Do NOT attempt controlled `activeIndex` on `Pie` — removed in Recharts 3.
9. Keep: `paddingAngle={3}`, `innerRadius="55%"`, `outerRadius="78%"`, `isAnimationActive={false}`, center label markup, empty state `Never pooled by a tournament.`, `data-testid="beatmap-rank-range"` on the panel, legend `ul` `aria-label="Tournaments by rank range"` (multi-bracket mode). Keep the `summarizeRankRangeMods` export in place (unit test imports it).

### Approach

**Shared tooltip body** — new module-level component (used by ChartTooltip content AND legend TapTooltips):

```tsx
const TOOLTIP_MOD_ROW_CAP = 5;

function RankBucketTooltipBody({
  slice,
  bucketMods,
}: {
  slice: RankRangeSlice;
  bucketMods?: { scoreCount: number; segments: ModSegment[] };
}) {
  const shown = bucketMods?.segments.slice(0, TOOLTIP_MOD_ROW_CAP) ?? [];
  const rest = bucketMods?.segments.slice(TOOLTIP_MOD_ROW_CAP) ?? [];

  return (
    <div className="min-w-44 space-y-1 text-xs">
      <div className="space-y-0.5 border-b pb-1.5">
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: slice.fill }}
            aria-hidden="true"
          />
          {`${slice.label} · ${formatChartNumber(slice.count)} ${slice.count === 1 ? 'pool' : 'pools'}`}
        </div>
        <p className="text-muted-foreground">
          {bucketMods
            ? `Mods in ${formatChartNumber(bucketMods.scoreCount)} verified scores`
            : 'No verified scores in this bracket'}
        </p>
      </div>
      {shown.map((segment) => (
        /* identical row markup to the current tooltip rows (old L402–421):
           swatch + label left,
           `${segment.percentageLabel} · ${formatChartNumber(segment.scoreCount)}` right */
      ))}
      {rest.length > 0 ? (
        <div className="flex items-baseline justify-between gap-4 text-muted-foreground">
          <span>{`+${rest.length} more`}</span>
          <span className="font-mono tabular-nums">
            {formatPercentage(rest.reduce((t, s) => t + s.percentage, 0), 1)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
```

**ChartTooltip** (replaces old L376–426 content): keep the outer chrome div (`rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl` — drop its `min-w-44 space-y-1 text-xs`, now on the body) and render `<RankBucketTooltipBody slice={slice} bucketMods={modsByBucket.get(slice.key)} />` inside. Tooltip element:

```tsx
<ChartTooltip
  offset={24}
  allowEscapeViewBox={{ x: true, y: true }}
  wrapperStyle={{ zIndex: 30 }}
  content={...}
/>
```

**activeShape** (replaces old L293–356; drops the `modsByBucket` dependency):

```tsx
const renderActiveSlice = React.useCallback((props: PieSectorDataItem) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius = 0,
    startAngle,
    endAngle,
    fill,
  } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}, []);
```

**Panel header** (replaces old L575–580):

```tsx
<div className="space-y-0.5">
  <Eyebrow>Rank range</Eyebrow>
  <p className="text-xs text-muted-foreground">Tournament registration floor</p>
</div>
```

**Panel body branch** (extends old L582–615):

```tsx
{
  rankSlices.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      Never pooled by a tournament.
    </p>
  ) : rankSlices.length === 1 ? (
    <div
      data-testid="beatmap-rank-range-summary"
      className="rounded-lg border bg-muted/25 px-3 py-6"
    >
      <p className="flex items-center justify-center gap-1.5 text-center text-sm font-medium">
        <span
          className="size-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: rankSlices[0].fill }}
          aria-hidden="true"
        />
        {rankSlices[0].count === 1
          ? `1 pool · ${rankSlices[0].label} rank`
          : `All ${formatChartNumber(rankSlices[0].count)} pools · ${rankSlices[0].label} rank`}
      </p>
    </div>
  ) : (
    <> {/* donut + legend + hint, as today with the edits below */} </>
  );
}
```

**Legend rows** (multi-bracket mode; replaces old L597–609 inner content). Import `TapTooltip` from `@/components/tap-tooltip`:

```tsx
{
  rankSlices.map((slice) => (
    <li key={slice.key}>
      <TapTooltip
        side="top"
        content={
          <RankBucketTooltipBody
            slice={slice}
            bucketMods={modsByBucket.get(slice.key)}
          />
        }
        triggerClassName="flex w-auto items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-accent"
      >
        <span
          className="size-2 rounded-[2px]"
          style={{ backgroundColor: slice.fill }}
          aria-hidden="true"
        />
        <span className="font-medium">{slice.label}</span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {formatChartNumber(slice.count)}
        </span>
      </TapTooltip>
    </li>
  ));
}
```

(`cn` in TapTooltip is tailwind-merge-backed so `flex w-auto` overrides the base `block w-full`; if the chip still stretches, wrap the `TapTooltip` in an `inline-flex` span. The Radix TooltipContent panel is `bg-accent text-accent-foreground` and the PopoverContent is `bg-popover` — the body's muted sub-caption and swatches read fine in both; do not add a second bordered chrome inside.)

**Hint** (replaces old L611–613):

```tsx
<p className="text-center text-xs text-muted-foreground">
  Hover or tap a slice to see mods within that bracket
</p>
```

`RankRangePie` keeps props `slices`, `totalPools`, `modsByBucket`; it is only mounted in the 2+-bracket branch.

### Test updates

- **No existing unit or e2e assertions break** (verified by grep: zero e2e references to `beatmap-rank-range`, "Hover a slice", "Rank range", freemod/grade testids; the unit test only exercises `summarizeRankRangeMods`, untouched). The score-total parity e2e (1674–1694) is unaffected: the removed `{n} pools` span never matched `/^[\d,]+ scores$/` and the new gloss/stat-line strings don't either.
- No new unit tests — all new logic is JSX branching on `rankSlices.length` and a slice cap; covered by visual verification.

### Verification

Commands per Global Constraints. Visual at 1440x1000 + 390x844, light + dark spot-check:

- `/beatmaps/46827` (multi-bracket): hover each slice — slice grows, NO mod-arc repaint; tooltip shows `Open · 20 pools`, sub-caption `Mods in {n} verified scores`, ≤5 mod rows (+`+k more` row if applicable); tooltip does not cover the center `50 / pools` label; hovering, tabbing to, or clicking a legend row opens the same content (click pins the popover, Escape closes); sliver brackets (`<1k`, `100k+`) inspectable via legend; hint reads exactly as specced; `Tournament registration floor` under the eyebrow; the old `{n} pools` header meta gone (center label still carries the count).
- `/beatmaps/869223` (single bracket): no donut — stat line `All 3 pools · Open rank` with the Open swatch; gloss present; no hint, no legend.
- `/beatmaps/2901604` (2 slices): donut kept; hover a bracket with pools but no verified scores → header + `No verified scores in this bracket`.
- `/beatmaps/884085`: `Never pooled by a tournament.` with the gloss line above it (valid check pre-Task-8).
- 390x844 on 46827: tap a slice — tooltip opens, stays inside the card; tap a legend chip — popover opens; no horizontal scroll.

---

## Task 4: Pool rows — mobile restack, cross-ruleset badge, em-dash mod fallback

Touches shared files: `apps/web/components/beatmap/BeatmapRecordsCard.tsx` (Task 5 edits it next — run this task first), `apps/web/app/beatmaps/[id]/page.tsx` (Tasks 6 and 8 carry disjoint edits).

### Files

- `apps/web/components/beatmap/BeatmapPoolRow.tsx` — edited
- `apps/web/components/beatmap/BeatmapRecordsCard.tsx` — edited (caption visibility + prop plumbing only)
- `apps/web/app/beatmaps/[id]/page.tsx` — edited (one prop)
- `apps/web/lib/beatmaps/records.ts` — edited (one new pure helper)
- `apps/web/lib/beatmaps/__tests__/records.test.ts` — edited (tests for the helper)

Verified facts: `BeatmapTournamentUsageSchema` already carries `tournament.ruleset` (`apps/web/lib/orpc/schema/beatmapStats.ts` L30) — no payload change needed. `Ruleset` enum (`packages/otr-core/src/osu/enums.ts` L117–122): `Osu=0, Taiko=1, Catch=2, ManiaOther=3, Mania4k=4, Mania7k=5`. `RulesetEnumHelper.getMetadata(r).text` yields `'osu!'`, `'osu!taiko'`, `'osu!catch'`, `'osu!mania (other)'`, `'osu!mania 4K'`, `'osu!mania 7K'`. The e2e sort test (~L1849–1879) reads game counts via `pools.locator('[aria-label$="games"], [aria-label$="game"]')` — every verified pool row must keep exactly ONE always-visible element whose aria-label ends in `games`/`game`; the unverified fallback label ends in `record` and must stay excluded.

### Requirements

1. **[MUST 1] Name gets the row's width on mobile, two-line wrap allowed.** Below `sm` (640px), the tournament-name span wraps to at most 2 lines (`line-clamp-2`) instead of truncating. At `sm+` it stays a single truncated line, visually identical to today. Acceptance: at 390x844 on `/beatmaps/46827`, "Stage's Tranquility Tournament 3" shows in full (wrapping allowed) — not `Stage's…`; on `/beatmaps/2901604`, "Advanced Taiko Frontier #1" and "Advanced Global Taiko Showdown 2021" are distinguishable without tapping.
2. **[MUST 1] Meta line keeps `date · NvN · rank range` intact on mobile.** The string `{dateLabel} · {lobbySize}v{lobbySize} · {rankRange}` is unchanged and must render unclipped at 390px for every visible row on fixtures 46827 and 2901604 (the rank-range tail — `10,000+`, `Open rank` — fully visible). `truncate` may remain on the text span as a safety valve only.
3. **[MUST 1] Spark bar dropped below `sm`.** The `h-1.5 w-12` games spark bar becomes `hidden sm:block`. The numeric count remains at all widths and keeps its exact current aria-labels (`"${n} verified games"` / `"${n} verified game"` / `'No verified game count for this pool record'`).
4. **[MUST 1] Mod chip moves to the meta line below `sm`.** The right-cluster mod column (`w-14`, `data-testid="beatmap-tournament-mod"`) becomes `hidden … sm:flex`. A mobile-only mod chip (same `ModIconset`, `h-4` sizing, `sm:hidden`) renders at the end of the meta line. Desktop DOM/appearance unchanged.
5. **[MUST 1] MOD/GAMES header captions collapse below `sm`.** The caption container in `BeatmapRecordsCard` (`div aria-hidden className="flex items-center gap-3"` at L105–113, holding the `Mod`/`Games` Eyebrows + toggle spacer) becomes `hidden … sm:flex`. At 390px only the Most played / Most recent Tabs show; at ≥640px captions render exactly as today, aligned with their columns.
6. **[MUST 1] Desktop layout unchanged.** At 1440x1000 the pool list is pixel-equivalent to the current build.
7. **[SHOULD 10] Ruleset badge when the pooling tournament's ruleset family differs from the beatmap's.** A muted `RulesetIcon` (size-3.5) on the name line (after VerificationBadge/LazerBadge), only when `isCrossRulesetPool(pool.tournament.ruleset, beatmapRuleset)`. Family normalization: `Mania4k`/`Mania7k`/`ManiaOther` are one family; `Osu`, `Taiko`, `Catch` their own. The badge carries `aria-label` and a `SimpleTooltip` with content `` `${RulesetEnumHelper.getMetadata(pool.tournament.ruleset).text} tournament` `` (e.g. `osu!catch tournament`). Renders at all widths. (SimpleTooltip is hover/focus-only; the `aria-label` keeps the badge accessible on touch — deliberate, see Deferred / flagged Flag D2.)
8. **[CONSIDER] Em dash instead of fabricated NM icon** on pool records with no verified games. When `!(verified && pool.gameCount > 0)` — the same condition that suppresses the expand toggle — both the desktop mod column and the mobile meta-line chip render a muted em dash `—` (`font-mono text-xs text-muted-foreground`, `aria-hidden`) instead of `ModIconset` (`mostCommonMod` defaults to `0` = NM when no verified games exist, fabricating data).

### Approach

**`apps/web/lib/beatmaps/records.ts`** — new helper (add `Ruleset` to the `@otr/core/osu` import):

```ts
function rulesetFamily(ruleset: Ruleset): Ruleset {
  return ruleset === Ruleset.Mania4k || ruleset === Ruleset.Mania7k
    ? Ruleset.ManiaOther
    : ruleset;
}

/**
 * True when a pool record comes from a tournament in a different ruleset
 * family than the beatmap — i.e. the tournament pooled a convert. 4K/7K/other
 * mania are one family, so key-mode variants never read as converts.
 */
export function isCrossRulesetPool(
  tournamentRuleset: Ruleset,
  beatmapRuleset: Ruleset
): boolean {
  return rulesetFamily(tournamentRuleset) !== rulesetFamily(beatmapRuleset);
}
```

**`page.tsx`**: add one prop at L106–111: `beatmapRuleset={stats.beatmap.ruleset}` on `<BeatmapRecordsCard …>`.

**`BeatmapRecordsCard.tsx`**: add prop `beatmapRuleset: Ruleset` (type from `@otr/core/osu`); pass through to every `<BeatmapPoolRow … beatmapRuleset={beatmapRuleset} />`. Caption row (L105–113): `className="flex items-center gap-3"` → `className="hidden items-center gap-3 sm:flex"`. Nothing else.

**`BeatmapPoolRow.tsx`** — keep the existing `grid grid-cols-[minmax(0,1fr)_auto]` container; on mobile the right cluster shrinks to count + toggle (~76px). The games count stays a SINGLE instance (its aria-label feeds the e2e sort test — do not duplicate it). Only the mod chip is dual-rendered (desktop cluster + mobile meta line), safe because `display:none` removes the hidden copy from the accessibility tree.

1. `POOL_COLUMN_CLASSES.games`: `'w-22'` → `'sm:w-22'`.
2. Name span (L60): `className="truncate"` → `className="line-clamp-2 sm:line-clamp-1"`.
3. Shared mod content:
   ```tsx
   const hasVerifiedGames = verified && pool.gameCount > 0;
   const modContent = hasVerifiedGames ? (
     <ModIconset
       mods={pool.mostCommonMod}
       freemod={pool.mostCommonModFreemod}
       className="flex h-full items-center"
       iconClassName="h-5" // mobile instance passes h-4
     />
   ) : (
     <span aria-hidden className="font-mono text-xs text-muted-foreground">
       —
     </span>
   );
   ```
   (Two small render sites are fine; condition and em-dash markup identical in both.)
4. Meta line (L83–86) becomes a flex row; text unchanged:
   ```tsx
   <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
     <span className="truncate">
       {dateLabel} · {pool.tournament.lobbySize}v{pool.tournament.lobbySize} ·{' '}
       {rankRange}
     </span>
     <span className="flex h-4 shrink-0 items-center sm:hidden">
       {/* mobile mod chip: ModIconset with iconClassName="h-4", or the em dash */}
     </span>
   </p>
   ```
5. Desktop mod column (L90–100): `cn('flex h-5 items-center', POOL_COLUMN_CLASSES.mod)` → `cn('hidden h-5 items-center sm:flex', POOL_COLUMN_CLASSES.mod)`; body becomes `modContent`. Keep `data-testid="beatmap-tournament-mod"` on this instance only.
6. Spark bar outer span (L107–110): → `className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:block"`.
7. Ruleset badge after the LazerBadge conditional (L77–81):
   ```tsx
   {
     isCrossRulesetPool(pool.tournament.ruleset, beatmapRuleset) && (
       <SimpleTooltip
         content={`${RulesetEnumHelper.getMetadata(pool.tournament.ruleset).text} tournament`}
       >
         <span
           className="shrink-0 text-muted-foreground"
           role="img"
           aria-label={`${RulesetEnumHelper.getMetadata(pool.tournament.ruleset).text} tournament`}
         >
           <RulesetIcon
             ruleset={pool.tournament.ruleset}
             className="size-3.5 fill-current [&_path]:fill-current"
           />
         </span>
       </SimpleTooltip>
     );
   }
   ```
   Imports to add: `SimpleTooltip` from `@/components/simple-tooltip`, `RulesetIcon` from `@/components/icons/RulesetIcon`, `RulesetEnumHelper` from `@/lib/enum-helpers`, `isCrossRulesetPool` from `@/lib/beatmaps/records`, `Ruleset` type from `@otr/core/osu`. New prop `beatmapRuleset: Ruleset`.

### Test updates

- **Nothing existing breaks** (verified: no e2e/unit test references the mod column testid, spark bar, caption row, name truncation, or row internals; the sort test's aria-label locator still matches exactly one visible element per verified row; page-geometry tests ~L1734–1768 assert card/rail/list boxes, not row internals; the 390px overflow test only gets easier).
- `apps/web/lib/beatmaps/__tests__/records.test.ts` — ADD `describe('isCrossRulesetPool')`: (a) `Catch` tournament vs `Osu` beatmap → true; (b) `Osu` vs `Osu` → false; (c) `Mania4k` tournament vs `ManiaOther` beatmap → false; (d) `Mania7k` vs `Mania4k` → false; (e) `ManiaOther` tournament vs `Osu` beatmap → true. Run `bun test apps/web/lib/beatmaps/__tests__/records.test.ts`.

### Verification

Commands per Global Constraints (including the records unit test). Visual:

- `/beatmaps/46827` at 390x844: full tournament names (≤2 lines); complete `date · 2v2 · rank` meta for all visible rows; no spark bars; mod chips on meta lines; no MOD/GAMES captions; unverified rows show `—` for both mod and count; no horizontal page scroll.
- `/beatmaps/46827` at 1440x1000: pool list identical to current production layout (compare against a before screenshot).
- `/beatmaps/2901604` at 390x844: the two "Advanced …" tournaments distinguishable.
- Badge check: scan all six fixtures' pool lists for a cross-ruleset row; confirm icon + tooltip there and absence on same-ruleset rows (mania fixtures 2024439/869223 must show NO badges on mania-family tournaments). If no fixture exposes a cross-ruleset pool, temporarily invert the `isCrossRulesetPool` call locally to confirm rendering, then restore.
- Light + dark spot-check of one pool row (badge and em dash are `text-muted-foreground`, theme-aware).

---

## Task 5: Records card interior — preserve tab state, cap the games panel, "Avg rating" label, scores-table ties + unknown player

Touches shared files: `apps/web/components/beatmap/BeatmapRecordsCard.tsx` (run AFTER Task 4), `apps/web/e2e/beatmaps.e2e.ts` (disjoint edit vs Tasks 2 and 6).

### Files

- `apps/web/components/beatmap/BeatmapRecordsCard.tsx` — edited
- `apps/web/components/beatmap/BeatmapPoolGamesPanel.tsx` — edited
- `apps/web/components/beatmap/BeatmapScoresTable.tsx` — edited
- `apps/web/e2e/beatmaps.e2e.ts` — edited (one added test; NEVER run)

Verified Radix gotcha: with `forceMount`, `@radix-ui/react-tabs` never applies the `hidden` attribute — a force-mounted inactive panel stays VISIBLE. `data-state="inactive"` is still set, so visibility MUST be handled with a `data-[state=inactive]:hidden` class, or both panels render stacked.

### Requirements

1. **[SHOULD 9] Tab switches must not destroy pool exploration state.** Expanding a pool row, switching to Scores, and switching back must return the row still expanded with its games panel populated, WITHOUT a second `tournamentMatches` network request. Mechanism: `forceMount` on both `TabsContent` panels (one attribute per panel; `displayCount` already survives in the parent, proving the Tabs remount is the only state destroyer).
2. **[SHOULD 9] Only the active panel is visible.** Both panels MUST get `data-[state=inactive]:hidden` in their className. Exactly one panel visible at a time; default shows Pools only.
3. **[CONSIDER] Cap the expanded games panel at 10 rows.** When a pool expands to more than 10 game rows (rows = games across all matches, flat-rendered), render the first 10 plus a full-width button labeled exactly `Show all {N}` (N = total rows, `toLocaleString()`). Clicking reveals all rows; the button disappears. One-shot reveal, not internal scroll (nested scroll is hostile on touch and hides rows from find-in-page). Constant `GAME_ROW_CAP = 10`. Panels with ≤10 rows unchanged.
4. **[CONSIDER] Relabel the expanded panel's `LOBBY` caption to `Avg rating`**, keeping `title={LOBBY_HINT}` (`'Average pre-match rating across the lobby'`). The neighboring column is already `Avg score`, so `Avg rating | Avg score` self-explains. Must fit the existing grid columns (5.5rem phone / 6rem sm+) without wrapping at the Eyebrow's `text-[10px] uppercase` size.
5. **[CONSIDER, scores table] Tied scores share a rank and are marked.** Standard competition ranking on `performer.score` over the server-ordered list: a run of equal scores all take the run's first position; the next distinct score resumes at its actual position (…, 6, =7, =7, =7, 14, …). Every member of a tie run of length ≥2 displays `={rank}` (no space); singletons show the bare number. Applies to BOTH the desktop table `#` column and the mobile stacked list's index span.
6. **[CONSIDER, scores table] Blank usernames render a placeholder.** When `performer.player.username` is empty/whitespace, the player-name span displays exactly `Unknown player`, styled muted italic (`text-muted-foreground italic`, dropping `font-medium`), in both branches. The player link still points at `/players/{id}`. Score-link aria-labels use the same display name (`View Unknown player's recorded score`).
7. **Column geometry absorbs the widest rank string.** Desktop `#` header `w-10` → `w-12`; mobile index span `w-4` → `w-7` (still `shrink-0 text-right`). Table `min-w-[39rem]` and all other columns unchanged.

### Approach

**`BeatmapRecordsCard.tsx`** — both panels (L86–90 and L153–157):

```tsx
<TabsContent
  value="pools"
  forceMount
  data-testid="beatmap-tournaments-list"
  className="mt-0 data-[state=inactive]:hidden"
>
…
<TabsContent
  value="scores"
  forceMount
  data-testid="beatmap-top-performers"
  className="mt-0 data-[state=inactive]:hidden"
>
```

No other change; `forceMount` passes through `ui/tabs.tsx` untouched.

**`BeatmapPoolGamesPanel.tsx`**:

- `const GAME_ROW_CAP = 10;` beside the hint constants; `const [showAll, setShowAll] = useState(false);`.
- Flatten before rendering (replaces the inline `matches.flatMap` at L107): `rows = matches.flatMap((match) => match.games.map((game) => ({ match, game })))`, then `const visibleRows = showAll ? rows : rows.slice(0, GAME_ROW_CAP);`, map `visibleRows` to the existing `<Link>` markup unchanged (key stays `game.gameId`).
- After the rows `div.divide-y`, when `rows.length > GAME_ROW_CAP && !showAll`:
  ```tsx
  <div className="border-t p-2">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full text-muted-foreground"
      onClick={() => setShowAll(true)}
    >
      <Plus aria-hidden />
      Show all {rows.length.toLocaleString()}
    </Button>
  </div>
  ```
  `Button` already imported; add `Plus` to the lucide import. `variant="ghost"` keeps the nested control quieter than the top-level outline "Show N more".
- Caption cell (L101): `<Eyebrow title={LOBBY_HINT}>Lobby</Eyebrow>` → `<Eyebrow title={LOBBY_HINT}>Avg rating</Eyebrow>`.

**`BeatmapScoresTable.tsx`** — pure helper above the component (no hooks; the file has no `'use client'` and needs none):

```ts
/** Competition ranks with tie flags: equal scores share the first position of their run. */
function computeDisplayRanks(
  performers: BeatmapTopPerformer[]
): { label: string }[] {
  return performers.map((performer, index) => {
    let start = index;
    while (start > 0 && performers[start - 1].score === performer.score)
      start -= 1;
    const tied =
      (index > 0 && performers[index - 1].score === performer.score) ||
      (index + 1 < performers.length &&
        performers[index + 1].score === performer.score);
    return { label: `${tied ? '=' : ''}${start + 1}` };
  });
}
```

Call `const ranks = computeDisplayRanks(performers);` before each branch's return; replace `{index + 1}` with `{ranks[index].label}` in both branches. Username: `const displayName = (performer.player.username ?? '').trim();` per row; name span:

```tsx
<span
  className={cn(
    'truncate text-sm group-hover:underline',
    displayName ? 'font-medium' : 'text-muted-foreground italic'
  )}
>
  {displayName || 'Unknown player'}
</span>
```

Add the `cn` import from `@/lib/utils`. Use `displayName || 'Unknown player'` in the two `aria-label={…recorded score}` strings; pass the raw username to `OsuAvatar` unchanged. Desktop `#` header cell: `className="h-8 w-10 pl-4"` → `"h-8 w-12 pl-4"`. Mobile index span: `w-4` → `w-7`.

### Test updates

- **Nothing existing breaks.** The scores-tab e2e (~L1799) clicks the tab before asserting visibility (the force-mounted panel is `display:none` until then). `'expanding tournament details reveals related matches'` (~L1915) uses `a[href*="/matches/"]` `.first()` — the pools panel precedes the scores panel in DOM, and the cap guarantees ≥1 of the first 10 rows. The scores-tab alignment test (~L1799–1846) counts `beatmap-top-play-*` testids and checks score-column x/width — the `#` column widening shifts all score cells uniformly; `/^Showing the top [\d,]+$/` untouched; no test reads the rank cell or player-name text.
- **ADD one e2e test** (in the `Usage Statistics` describe, after the sort test; EDIT ONLY, never run):

```ts
test('keeps an expanded pool open across a tab round-trip', async ({
  page,
}) => {
  await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
  await page.waitForLoadState('networkidle');

  const toggle = page
    .locator('[data-testid^="beatmap-tournament-details-toggle-"]')
    .first();
  await toggle.click();
  await expect(page.locator('a[href*="/matches/"]').first()).toBeVisible({
    timeout: 15000,
  });

  let refetched = false;
  page.on('request', (request) => {
    if (request.url().includes('tournamentMatches')) refetched = true;
  });

  await page.getByRole('tab', { name: 'Scores' }).click();
  await page.getByRole('tab', { name: 'Pools' }).click();

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('a[href*="/matches/"]').first()).toBeVisible();
  expect(refetched).toBe(false);
});
```

### Verification

Commands per Global Constraints. Visual:

- `/beatmaps/46827` at 1440x1000: expand the top pool (13 games) → 10 rows + `Show all 13`; click → 13 rows, button gone; ≤10-game pools show no button. Pools → Scores → Pools: row still expanded, no spinner flash, `tournamentMatches` fired exactly once (network panel). Only one panel visible at any time.
- Same page at 390x844: cap + button render in the narrow grid; `AVG RATING` caption fits its 5.5rem column without wrapping; no horizontal scroll.
- `/beatmaps/1530447` Scores tab, both viewports: the seven 1,007,000 ties render `=7` through the run and the next distinct score resumes at `14`; if a restricted-player row exists, `Unknown player` renders muted-italic (if no fixture shows a blank username, temporarily render `displayName = ''` for one row, screenshot, revert).
- `/beatmaps/46827` Scores tab, both viewports: ranks render, columns aligned, nothing clips in `#`.
- Light + dark quick glance on one tied row.

---

## Task 6: Box-plot depth layer, MEDIAN labels, axis footers, true totals, percentile fixes

Touches shared files: `apps/web/app/beatmaps/[id]/page.tsx` (disjoint vs Tasks 4 and 8), `apps/web/e2e/beatmaps.e2e.ts` (disjoint vs Tasks 2 and 5). Consumes `TapTooltip` + `useMediaQuery` from Task 1.

### Files

- `apps/web/components/beatmap/BeatmapScoreDistributionCard.tsx` — edited
- `apps/web/components/beatmap/BeatmapTierBreakdownCard.tsx` — edited
- `apps/web/app/beatmaps/[id]/page.tsx` — edited (one prop)
- `apps/web/e2e/beatmaps.e2e.ts` — edited (one added test; NEVER run)

Anatomy: `BeatmapScoreDistributionCard.tsx` — `BoxPlotRow` L47–176 (whole row wrapped in `SimpleTooltip` at L64/L113), `PercentileCurve` L178–250 (animated `Area`), header meta sums the **clamped** `scoreDistribution` array (819 on the flagship vs the true 822; local reduce at L257–260). `BeatmapTierBreakdownCard.tsx` — `TierBoxPlotRow` L163–235 (`SimpleTooltip` at L179), `TierAccuracyRow` + min/max axis footer under "Accuracy by tier" at L346–353 (the pattern to copy). `page.tsx` already computes `totalVerifiedScoreCount` (L76–79). No e2e or unit test references these cards (grep-verified).

### Requirements

1. **[MUST 2] Box-plot depth reachable on touch.** Tapping a "By mod" row (Score distribution) or a "Score by tier" row (Tier breakdown) opens a popover with exactly the content today's hover tooltip shows (header with swatch/tier icon + `{n} scores`, Median / Middle 50% / Range rows, plus Median accuracy on tier rows). Tapping outside or Escape closes. Acceptance: Chrome touch emulation at 390x844 on `/beatmaps/46827`, tapping the DT row shows Median/Middle 50%/Range; tapping elsewhere dismisses.
2. **[MUST 2] Box-plot depth reachable by keyboard.** Each row is a real focusable control: Tab reaches every row in both cards; focus opens the Radix tooltip; Enter/Space toggles the popover; Escape closes; visible focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none`).
3. **[MUST 2] Desktop hover preserved.** Hover still shows the tooltip instantly; the popover only opens on click/tap/Enter; tooltip and popover never visible simultaneously. (Desktop click-to-pin is an intentional additive side effect — see Deferred / flagged Flag D8.)
4. **[CONSIDER — collision fix] Tooltip stops covering the card header and the hovered row.** Default placement `side="bottom"` with `sideOffset={6}` and `collisionPadding={8}` for both tooltip and popover (Radix flips near the viewport bottom). Acceptance: at 1440x1000, hovering the FIRST "By mod" row on `/beatmaps/46827` shows the tooltip below the row; header and row fully visible.
5. **[SHOULD 4] "MEDIAN" column label.** Both box-plot panels get a right-aligned micro-label over the value column using the existing `Eyebrow` component (source string `Median`; its `uppercase` class renders MEDIAN), on the same line as the panel eyebrow ("By mod" / "Score by tier"), pushed to the right edge over the `w-12` value column.
6. **[SHOULD 4] 0/max axis footer under both box-plot stacks.** Copy the exact pattern at BeatmapTierBreakdownCard L346–353: `mt-2 flex items-center gap-2` row, left spacer matching the label column, `flex min-w-0 flex-1 justify-between font-mono text-[10px] text-muted-foreground tabular-nums` holding `0` and `formatKilo(maxScore)`, right spacer matching the value column. Spacer widths: `w-16`/`w-12` in Score distribution, `w-28`/`w-12` in Tier breakdown.
7. **[SHOULD 6] Score distribution header shows the true verified total.** `BeatmapScoreDistributionCard` gains a required prop `totalScoreCount: number`; `page.tsx` passes the already-computed `totalVerifiedScoreCount`. Header meta becomes `${formatChartNumber(totalScoreCount)} scores` (still only when `hasBoxData`). Delete the local `distribution.reduce(...)` sum (L257–260). The caption `Mod combinations with fewer than 5 scores hidden` stays byte-identical — it is the sanctioned explanation for the header-vs-rows delta. Acceptance: 46827 header reads **"822 scores"** (was 819) and matches the Scores-tab/scatter/Performance metas; 2901604 reads "62 scores" (was 57). Client-side only.
8. **[MUST 7, percentile part] Percentile chart renders without mount animation.** `<Area … isAnimationActive={false} />` in `PercentileCurve`. Acceptance: an immediate post-load full-page screenshot shows the curve painted, not blank axes.
9. **[CONSIDER] Percentile plain-language caption.** Under the percentile chart (inside the "Percentiles" panel, after the chart wrapper), exactly:
   `Each point shows the share of tournament plays a score beats. Steep = scores bunched together, flat = wide gaps.`
   styled `mt-2 font-mono text-xs text-muted-foreground`. Rendered only when `hasCurveData`.
10. **[CONSIDER] Percentile x-axis drops to 3 ticks at phone width.** Below `sm` (640px) the `XAxis` uses `tickCount={3}`; at `sm+` the default 5. Use `useMediaQuery('(max-width: 639px)')` from Task 1.

### Approach

**`BeatmapScoreDistributionCard.tsx`**:

- Replace the `SimpleTooltip` wrapper in `BoxPlotRow` (L64/L113) with `TapTooltip` (import from `@/components/tap-tooltip`) — the `content` block and the inner row `<div className="flex min-h-7 items-center gap-2">` are unchanged; the row div becomes the button's child. Remove the now-unused `SimpleTooltip` import.
- Props: add `totalScoreCount: number`; delete the local reduce; header meta uses the prop.
- Panel header line (currently bare `<Eyebrow>By mod</Eyebrow>`):
  ```tsx
  <div className="flex items-baseline justify-between">
    <Eyebrow>By mod</Eyebrow>
    {hasBoxData ? <Eyebrow>Median</Eyebrow> : null}
  </div>
  ```
- Axis footer after the box-row stack, before the "<5 hidden" caption, only when `hasBoxData`:
  ```tsx
  <div className="mt-2 flex items-center gap-2">
    <span className="w-16 shrink-0" aria-hidden="true" />
    <span className="flex min-w-0 flex-1 justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
      <span>0</span>
      <span>{formatKilo(maxScore)}</span>
    </span>
    <span className="w-12 shrink-0" aria-hidden="true" />
  </div>
  ```
  (The stack's children are now `<button>`s; the footer is their sibling in the same padded container, so spacers line up with the internal `w-16`/`w-12` columns.)
- `PercentileCurve`: `isAnimationActive={false}` on `<Area>`; `const isNarrow = useMediaQuery('(max-width: 639px)');` and `tickCount={isNarrow ? 3 : 5}` on the `XAxis`; caption per req 9 in the parent panel after `<div className="mt-3"><PercentileCurve …/></div>`.
- The sparse branch (`distribution.length < 3`, mania 7K) needs no special handling — buttons flow identically.

**`BeatmapTierBreakdownCard.tsx`**:

- Replace `SimpleTooltip` in `TierBoxPlotRow` (L179) with `TapTooltip`; remove the unused import. `TierTooltipContent` unchanged. `TierAccuracyRow` stays a plain div (value fully printed inline; no hidden depth).
- "Score by tier" header line gets the same `justify-between` treatment with `<Eyebrow>Median</Eyebrow>`.
- Axis footer after the score-by-tier `space-y-2` stack — same block with `w-28`/`w-12` spacers and `formatKilo(maxScore)`. The existing accuracy footer (L346–353) untouched.

**`page.tsx`** (L88–94 area):

```tsx
<BeatmapScoreDistributionCard
  className="lg:col-span-2"
  distribution={stats.scoreDistribution}
  percentiles={stats.scorePercentiles}
  totalScoreCount={totalVerifiedScoreCount}
/>
```

### Test updates

- **Nothing breaks** (grep-verified: no e2e/unit assertion references these cards, their testids, their metas, or SimpleTooltip behavior).
- **ADD (edit only — NEVER run)** to `apps/web/e2e/beatmaps.e2e.ts`, alongside the existing detail-page tests:
  ```ts
  test('box plot rows pin their stats in a popover on click', async ({
    page,
  }) => {
    await page.goto(`/beatmaps/${TEST_BEATMAP_OSU_ID}`);
    const card = page.locator('[data-testid="beatmap-score-distribution"]');
    await card.getByRole('button').first().click();
    const popover = page.getByRole('dialog');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Median');
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();
  });
  ```

### Verification

Commands per Global Constraints. Visual at 1440x1000, light, `/beatmaps/46827`: hover first By-mod row → tooltip BELOW the row, header + row unobstructed; click → popover pins with Median/Middle 50%/Range, Escape closes, no double-render; Tab to a box row → ring visible, tooltip opens; MEDIAN over the value column in both cards; `0`/`…k` footers align with track edges; header meta "822 scores" matching scatter/Performance; immediate post-reload screenshot shows the percentile curve painted with the caption under it. At 390x844 (touch emulation): tap a box row in each card → popover opens within viewport, tap outside closes; percentile x-axis shows 3 ticks; no horizontal overflow. Dark spot-check: one 1440 screenshot of an open popover. Sparse/empty: `/beatmaps/869223` (2-row stack renders, footer aligns) and `/beatmaps/884085` (card shows `EmptyState`, no crash with the prop present, meta hidden — valid check pre-Task-8).

---

## Task 7: Misses + closeness histograms and scatter axes/dots

Touches shared files: none beyond this task. Consumes `useMediaQuery` from Task 1.

### Files

- `apps/web/components/beatmap/BeatmapPerformanceCard.tsx` — edited
- `apps/web/components/beatmap/BeatmapMarginCard.tsx` — edited
- `apps/web/components/beatmap/BeatmapScoreScatterCard.tsx` — edited

No e2e or unit test references any of these cards (grep-verified — "Retitle Performance card — zero test references"; "Game closeness" absent from the e2e spec; nothing references the scatter card).

### Requirements

1. **[MUST 7] No mount animation.** `isAnimationActive={false}` on the misses `<Bar>` and the closeness `<Bar>` (the scatter already has it). Acceptance: immediate post-load full-page screenshot shows both histograms painted.
2. **[SHOULD 3] Misses histogram gets the y-axis its closeness sibling has.** Copy the closeness chart's axis + grid verbatim into the misses `BarChart`:
   ```tsx
   <CartesianGrid strokeDasharray="3 3" vertical={false} />
   <YAxis
     width={32}
     allowDecimals={false}
     tickLine={false}
     axisLine={false}
     tickFormatter={formatChartNumber}
   />
   ```
   Change the misses `BarChart` margin from `{ top: 8, right: 8, left: 8, bottom: 0 }` to `{ top: 8, right: 8, left: 0, bottom: 0 }` (the axis supplies the left gutter). Import `CartesianGrid` and `YAxis` from `recharts`. Chart height stays `h-[140px]`. Acceptance: on 46827 the 0–4 bars read against gridlines and the `5+` bar's ~470 magnitude is legible without hover.
3. **[CONSIDER] Retitle "Performance" → "Misses".** `SectionHeader` `title="Misses"` (icon stays `Target`, testid stays `beatmap-performance`, meta stays `${formatChartNumber(scoreCount)} scores`). Delete the now-redundant `<Eyebrow>Misses</Eyebrow>` inside the body and the unused `Eyebrow` import.
4. **[CONSIDER] Closeness subtitle.** First child of the card body (`space-y-3 px-4 py-4` div, above `ChartContainer`), exactly:
   `How one-sided were games on this map?`
   as `<p className="font-mono text-xs text-muted-foreground">`. The footer sentence ("Winning margin as a share… Left-heavy = coinflip map, right-heavy = stomps.") stays byte-identical.
5. **Empty states unchanged**: "No verified scores yet." / "No miss data recorded for these scores." / "No team-vs games recorded for this beatmap." and the `{n} scores without miss data excluded` caption stay byte-identical. Do not touch `MISS_BUCKET_LABELS` (server clamp — out of scope).
6. **[SHOULD 5] Scatter axis titles.** X axis `Pre-match rating`, Y axis `Score` — capitalized to match the tooltip's existing `name` props verbatim. Muted micro-label style: `fill: 'var(--muted-foreground)'`, `fontSize: 10`. The provenance footnote ("Pre-match ratings · recent scores may not have ratings yet…") stays byte-identical.
7. **[CONSIDER] Smaller, lighter scatter dots below `sm`.** Below 640px: `ZAxis range={[14, 14]}` and `Scatter fillOpacity={0.45}`; at `sm+` today's `[30, 30]` / `0.65` unchanged. Acceptance: 390 vs 1440 side-by-side on 46827 shows visibly separated points at 390; 1440 pixel-identical to current.
8. **No scatter behavior regressions**: legend toggling, trendline, tooltip, `isAnimationActive={false}` (already present), sampling meta, and all three empty states stay as-is.

### Approach

Misses chart after the change mirrors the closeness chart's skeleton exactly (grid → XAxis → YAxis → ChartTooltip → Bar), differing only in height (140 vs 220) and tooltip formatter. No new components, no color changes (`var(--chart-1)` fills stay).

Scatter (`BeatmapScoreScatterCard.tsx`):

```tsx
const isNarrow = useMediaQuery('(max-width: 639px)');

<ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
  <XAxis
    /* existing props unchanged */
    label={{
      value: 'Pre-match rating',
      position: 'insideBottom',
      offset: -12,
      fill: 'var(--muted-foreground)',
      fontSize: 10,
    }}
  />
  <YAxis
    /* existing props unchanged except width */
    width={56}
    label={{
      value: 'Score',
      angle: -90,
      position: 'insideLeft',
      offset: 8,
      fill: 'var(--muted-foreground)',
      fontSize: 10,
    }}
  />
  <ZAxis range={isNarrow ? [14, 14] : [30, 30]} />
  …
  <Scatter
    data={visiblePoints}
    fillOpacity={isNarrow ? 0.45 : 0.65}
    isAnimationActive={false}
  >
```

Geometry: chart margin `bottom` 0 → 16 so the `insideBottom` label clears the ticks; `YAxis width` 44 → 56 so the rotated "Score" clears the `formatKilo` ticks. These are starting values — Recharts label placement is finicky; tune `offset`/`width` against live screenshots until neither title clips nor overlaps ticks at 1440 and 390. `ZAxis range` is symbol AREA in px² (14 ≈ 0.68x diameter of 30). Import `useMediaQuery` from `@/lib/hooks/useMediaQuery`.

### Test updates

None — nothing references these cards. No edits required.

### Verification

Commands per Global Constraints. Visual at 1440x1000 and 390x844, `/beatmaps/46827` and `/beatmaps/2901604`: immediate post-load screenshot with both histograms painted; Misses card titled "Misses" with a single heading, y-axis + gridlines consistent with the closeness card beside it; closeness subtitle above the chart, original footer below; at 390px no horizontal overflow, ticks legible. Scatter: "Pre-match rating" centered under the x ticks, "Score" rotated along the y axis, neither clipping nor overlapping ticks; dots smaller/lighter at 390. Also `/beatmaps/869223` (sparse chart — titles must not crowd) and `/beatmaps/884085` (both cards + scatter still render empty states — valid check pre-Task-8). Light theme sufficient; one dark spot-check screenshot is cheap insurance.

---

## Task 8: Zero-data collapse, ruleset-aware attributes, activity stat labels

Touches shared files: `apps/web/app/beatmaps/[id]/page.tsx` (disjoint vs Tasks 4 and 6 — this task adds an early return near the top; run after them so earlier tasks can verify per-card empty states on `/beatmaps/884085`).

### Files

- `apps/web/app/beatmaps/[id]/page.tsx` — edited (early-return branch)
- `apps/web/lib/beatmaps/presentation.ts` — edited (add `getBeatmapAttributeRows`)
- `apps/web/lib/beatmaps/__tests__/presentation.test.ts` — edited (tests for the new map)
- `apps/web/components/beatmap/BeatmapAttributesCard.tsx` — edited
- `apps/web/components/beatmap/BeatmapActivityCard.tsx` — edited

### Requirements

1. **(MUST 5)** When the beatmap has zero pools AND zero verified scores, the page renders exactly three cards — header, attributes, activity — plus ONE compact empty band. The seven analytics cards (`BeatmapDistributionsCard`, `BeatmapRecordsCard`, `BeatmapScoreDistributionCard`, `BeatmapScoreScatterCard`, `BeatmapPerformanceCard`, `BeatmapMarginCard`, `BeatmapTierBreakdownCard`) must not mount. Gate, computed in `BeatmapPage` from values already present: `stats.tournaments.length === 0 && totalVerifiedScoreCount === 0` (`totalVerifiedScoreCount` exists at page.tsx L76–79). Deliberately narrow: a map with pool records but no verified scores (or vice versa) keeps today's per-card empty states. Acceptance: `/beatmaps/884085` renders header + band + attributes + activity and nothing else (page height drops from ~2068px to well under one desktop viewport of card content).
2. **(MUST 5)** Band headline, verbatim: `No verified tournament data recorded yet`. Supporting line (must NOT mention verification/rejection reasons): `Pool records and score analytics will appear once a verified tournament uses this beatmap.`
3. Data-rich pages byte-identical to today (`/beatmaps/46827` unchanged — gate false).
4. The band composes only existing vocabulary: `SectionCard` from `@/components/beatmap/BeatmapSection` + a Lucide icon + semantic tokens. No new `ui/` primitive, no new component file.
5. Mobile ordering: at <lg, the band appears immediately after the header (before attributes/activity); at lg, the rail keeps the left 15rem column and the band fills the main column.
6. **(SHOULD 2)** One ruleset-conditional map drives the attributes card, keyed off `beatmap.ruleset`:
   - **osu!**: unchanged — CS, AR, OD, HP, all gauges, none muted.
   - **taiko**: order OD, HP, CS, AR; CS and AR muted.
   - **catch**: order AR, CS, HP, OD; OD muted.
   - **mania** (`ManiaOther`/`Mania4k`/`Mania7k` via existing `isManiaRuleset`): first row relabeled `Keys` (`<abbr title="Key count">`), value = `beatmap.cs` as an integer (`4`, `7` — no `.0`), NO 0–10 gauge; then OD, HP with gauges; AR muted last.
   - Uniform pick where the review offered "drops/mutes": **mute, never drop** — muting keeps data visible and one mechanism serves all four rulesets.
7. Muted rows: whole row `opacity-60`, gauge omitted (replaced by an invisible flex spacer so the value stays right-aligned), value still rendered. Unmuted rows keep today's exact rendering.
8. The `dt` label column widens `w-6` → `w-9` on all rulesets so uppercase `KEYS` fits at `text-[10px]` (the ~12px gauge shrink on osu! is imperceptible; "osu! unchanged" refers to content).
9. **(SHOULD 8)** Games stat gains a label-level qualifier, verbatim: `(incl. unverified)`, rendered as a second smaller muted line under the `Games` label (a one-line label would truncate in the 15rem rail). The stat's `accessibleValue` becomes `` `${n} games played (incl. unverified)` `` — **appending** keeps the pinned e2e regex `/[\d,]+ games played/` matching (unanchored; do not rewrite the prefix). Tooltip alternative rejected: SimpleTooltip is dead on touch and this contradiction matters most on mobile empty pages. Acceptance on 884085: `Games` / `(incl. unverified)` / `23` no longer flatly contradicts "Never played in a verified match."
10. **(CONSIDER pick rate)** Pick rate value becomes `` `${played}/${pooled} (${rate}%)` `` — e.g. `46/50 (92%)`. Null case (`pickRate === null`) stays `—`. `accessibleValue` strings unchanged. `getPoolPickRate` in `lib/beatmaps/records.ts` NOT modified.

### Approach

**`page.tsx`** — early-return after computing `totalVerifiedScoreCount` (server component, no client code):

```tsx
const hasNoVerifiedData =
  stats.tournaments.length === 0 && totalVerifiedScoreCount === 0;

if (hasNoVerifiedData) {
  return (
    <div className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0">
      <BeatmapHeader
        beatmap={stats.beatmap}
        relatedDifficulties={stats.relatedDifficulties}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Band first in DOM so it stacks directly under the header on mobile;
            order utilities put the rail back on the left at lg. */}
        <SectionCard
          data-testid="beatmap-empty-band"
          className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center lg:order-2"
        >
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">
            No verified tournament data recorded yet
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Pool records and score analytics will appear once a verified
            tournament uses this beatmap.
          </p>
        </SectionCard>
        <div className="space-y-4 lg:sticky lg:top-20 lg:order-1">
          <BeatmapAttributesCard beatmap={stats.beatmap} />
          <BeatmapActivityCard
            data={stats.usageOverTime}
            summary={stats.summary}
            pools={stats.tournaments}
          />
        </div>
      </div>
    </div>
  );
}
```

New imports: `SectionCard` from `@/components/beatmap/BeatmapSection`, `Inbox` from `lucide-react`. The normal-path return stays untouched.

**`lib/beatmaps/presentation.ts`** (pure, server-safe, next to `getBeatmapDisplayRuleset`):

```ts
export interface BeatmapAttributeRow {
  abbreviation: string;
  label: string;
  key: 'cs' | 'ar' | 'od' | 'hp';
  muted?: boolean; // default false
  gauge?: boolean; // default true
  integer?: boolean; // default false — render Math.round(value), no gauge scale
}

const CS = { abbreviation: 'CS', label: 'Circle size', key: 'cs' } as const;
const AR = { abbreviation: 'AR', label: 'Approach rate', key: 'ar' } as const;
const OD = {
  abbreviation: 'OD',
  label: 'Overall difficulty',
  key: 'od',
} as const;
const HP = { abbreviation: 'HP', label: 'HP drain', key: 'hp' } as const;

export function getBeatmapAttributeRows(
  ruleset: Ruleset
): BeatmapAttributeRow[] {
  if (isManiaRuleset(ruleset)) {
    return [
      {
        abbreviation: 'Keys',
        label: 'Key count',
        key: 'cs',
        gauge: false,
        integer: true,
      },
      { ...OD },
      { ...HP },
      { ...AR, muted: true, gauge: false },
    ];
  }
  switch (ruleset) {
    case Ruleset.Taiko:
      return [
        { ...OD },
        { ...HP },
        { ...CS, muted: true, gauge: false },
        { ...AR, muted: true, gauge: false },
      ];
    case Ruleset.Catch:
      return [
        { ...AR },
        { ...CS },
        { ...HP },
        { ...OD, muted: true, gauge: false },
      ];
    default:
      return [{ ...CS }, { ...AR }, { ...OD }, { ...HP }];
  }
}
```

**`BeatmapAttributesCard.tsx`** — replace the hardcoded `attributes` array with `getBeatmapAttributeRows(beatmap.ruleset)`, read values via `beatmap[row.key]`. Row sketch (structure otherwise unchanged):

```tsx
<div key={row.abbreviation}
     className={cn('flex items-center gap-3 px-4 py-2.5', row.muted && 'opacity-60')}>
  <dt className="w-9 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">
    <abbr title={row.label} className="cursor-help no-underline">
      <span aria-hidden>{row.abbreviation}</span>
      <span className="sr-only">{row.label}</span>
    </abbr>
  </dt>
  <dd className="flex min-w-0 flex-1 items-center gap-3">
    {row.gauge !== false ? (
      /* existing meter span, unchanged */
    ) : (
      <span className="min-w-0 flex-1" aria-hidden />
    )}
    <span className="w-8 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
      {row.integer ? Math.round(value).toString() : value.toFixed(1)}
    </span>
  </dd>
</div>
```

**`BeatmapActivityCard.tsx`** — extend `ActivityStat` with optional `sublabel?: string`:

```tsx
<dt className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
  <Icon className="size-4 shrink-0" aria-hidden />
  <span className="min-w-0">
    <span className="block truncate">{label}</span>
    {sublabel ? (
      <span className="block truncate text-[10px] leading-tight">
        {sublabel}
      </span>
    ) : null}
  </span>
</dt>
```

Call sites:

```tsx
<ActivityStat
  testId="beatmap-games"
  icon={Gamepad2}
  label="Games"
  sublabel="(incl. unverified)"
  value={summary.totalPlayedGameCount.toLocaleString()}
  accessibleValue={`${summary.totalPlayedGameCount.toLocaleString()} games played (incl. unverified)`}
/>
```

```tsx
value={
  pickRate === null
    ? '—'
    : `${summary.pooledPlayedTournamentCount.toLocaleString()}/${summary.totalTournamentCount.toLocaleString()} (${pickRate}%)`
}
```

### Test updates

- **Unit — `lib/beatmaps/__tests__/presentation.test.ts`**: add a `getBeatmapAttributeRows` describe: osu! returns CS/AR/OD/HP unmuted in that order; taiko returns OD/HP first with CS+AR muted and gauge-less; catch returns AR/CS/HP then muted OD; all three mania rulesets return `Keys` first with `gauge: false`, `integer: true`, `key: 'cs'` and muted AR. Existing `getBeatmapDisplayRuleset` tests untouched. Run `bun test apps/web/lib/beatmaps/__tests__/presentation.test.ts`.
- **e2e**: NO edits required — `displays difficulty attributes (CS, AR, OD, HP)` (~L1563–1587) asserts `abbr[title=…]` against the osu!-standard fixture 665721, where all four stay rendered; activity accessible-name assertions (~L1628–1632) keep matching (`/[\d,]+ games played/` unanchored; `Picked in … pools, Z%` accessibleValue untouched); icon assertions unchanged. All detail e2e runs against data-rich 665721 where the collapse gate is false. Do NOT add an 884085 e2e (separate fixture DB).
- **`records.test.ts`**: untouched — `getPoolPickRate` not modified.

### Verification

Commands per Global Constraints (including the presentation unit test). Visual at 1440x1000 AND 390x844:

- `/beatmaps/884085` at 1440: header, rail (attributes + activity) left, band right; band compact (~py-12) with the exact copy; no analytics cards; no empty second column. At 390: order header → band → attributes → activity; no horizontal overflow. Light + dark (new surface).
- `/beatmaps/46827` at 1440: pixel-identical to before this task (spot-check all 8 section headings present); Pick rate reads `46/50 (92%)` shape; Games row shows the `(incl. unverified)` sub-line without truncation in the 15rem rail; attributes card identical except the ~12px wider label column.
- `/beatmaps/2901604` (taiko): order OD, HP, CS, AR; CS/AR dimmed, no bars, values printed.
- `/beatmaps/884085` (catch): order AR, CS, HP, OD; OD dimmed (rendered in the empty-state layout).
- `/beatmaps/2024439`: first row `KEYS 4`, no gauge; AR dimmed last. `/beatmaps/869223`: `KEYS 7`.

---

## Task 9: Difficulty-dot labels on mobile + loading skeleton tuning

Touches shared files: none beyond this task.

### Files

- `apps/web/components/beatmap/BeatmapHeader.tsx` — edited
- `apps/web/app/beatmaps/[id]/loading.tsx` — edited (NOT `apps/web/app/beatmaps/loading.tsx` — that is the LIST page skeleton)

### Requirements

1. **(CONSIDER dots)** Below `sm`, non-current difficulty entries in `DifficultyNavigator` render as labeled pills — ruleset/SR-colored icon + truncated diff name + SR — instead of anonymous 40px icon squares, so name and SR are visible BEFORE navigation. At `sm+` they stay exactly today's icon-only `size-10` squares with the hover `SimpleTooltip`. (Tap-to-peek was evaluated and rejected: the dots are `<Link>`s that navigate on first tap and Radix tooltips never open on touch — inline labels are the review's other sanctioned option and pure CSS.) Label format: diff name (`truncate`, capped width) + `{sr.toFixed(2)} SR` in `font-mono text-xs text-muted-foreground`. The scroller is already `overflow-x-auto snap-x`, so wider pills scroll horizontally and cannot cause document overflow.
2. **(CONSIDER dots, copy)** The desktop hover tooltip content changes from `` `${diffName} · ${sr} stars` `` to `` `${diffName} · ${sr} SR` `` — aligns with the page-wide "N.NN SR" convention AND with the EXISTING e2e assertion `toContainText(/ SR/)` at e2e L1490, which the current "stars" copy cannot satisfy (pre-existing red assertion; this fixes it source-side). The `aria-label` stays `` `${diffName}, ${sr} star rating` `` (pinned by `toHaveAccessibleName(/star rating/)` at e2e L1476).
3. **(CONSIDER skeleton)** `loading.tsx` heights match the measured real cards and the lower chart grid gains skeletons. Measured @1440 on the flagship: header 358px, distributions 465px (828px @390), attributes 212px, activity 447px, records (12 rows) 935px, score distribution 382px, scatter 438px, performance 362px, closeness 362px, tier 422px. Acceptance: each skeleton within ~15% of the measured 1440 height; the lower `lg:grid-cols-2` grid mirrored including `lg:col-span-2` spans; container and grid classes identical to page.tsx so nothing jumps horizontally.
4. No `ui/` changes; `Skeleton` from `@/components/ui/skeleton` remains the only primitive in loading.tsx.

### Approach

**`BeatmapHeader.tsx`**, non-current branch of `renderDifficulty` (~L194–213; keep the `SimpleTooltip` wrapper — hover/focus-only, inert on touch, harmless with the mobile label visible):

```tsx
<Link
  data-testid={`related-difficulty-${difficulty.osuId}`}
  href={`/beatmaps/${difficulty.osuId}`}
  prefetch={false}
  aria-label={accessibleLabel}
  className="flex min-h-10 max-w-64 shrink-0 snap-start items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:size-10 sm:max-w-none sm:justify-center sm:gap-0 sm:px-0 sm:py-0 dark:bg-input/40 dark:hover:bg-secondary/60"
>
  {difficultyIcon}
  <span className="min-w-0 truncate font-medium sm:hidden">
    {difficulty.diffName}
  </span>
  <span className="shrink-0 font-mono text-xs text-muted-foreground sm:hidden">
    {formattedRating} SR
  </span>
</Link>
```

Tooltip content becomes `<span>{difficulty.diffName} · {formattedRating} SR</span>`. The current-difficulty pill and the auto-centering effect are untouched.

**`loading.tsx`** — full replacement of the block list (comment updated to mention the lower grid):

```tsx
<Skeleton className="h-[23rem] w-full rounded-xl" />
<Skeleton className="h-[48rem] w-full rounded-xl lg:h-[29rem]" />
<div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
  <div className="space-y-4">
    <Skeleton className="h-[13rem] w-full rounded-xl" />
    <Skeleton className="h-[27rem] w-full rounded-xl" />
  </div>
  <Skeleton className="h-[36rem] w-full rounded-xl" />
</div>
<div className="grid gap-4 lg:grid-cols-2">
  <Skeleton className="h-[24rem] w-full rounded-xl lg:col-span-2" />
  <Skeleton className="h-[27rem] w-full rounded-xl lg:col-span-2" />
  <Skeleton className="h-[23rem] w-full rounded-xl" />
  <Skeleton className="h-[23rem] w-full rounded-xl" />
  <Skeleton className="h-[26rem] w-full rounded-xl lg:col-span-2" />
</div>
```

(Mapping: header 23rem≈358–362px; distributions 29rem lg / 48rem stacked; attributes 13rem; activity 27rem; records 36rem — a deliberate compromise between the 12-row flagship at 935px and sparse maps; score distribution 24rem; scatter 27rem; performance/closeness 23rem; tier 26rem.)

### Test updates

- **e2e: NO edits required.** `shows the same-set difficulty navigator` (~L1454–1492) runs at desktop viewport where `sm:` styles apply — `boundingBox().width <= 42` (L1478) still holds for icon-only squares; `toHaveAccessibleName(/star rating/)` unchanged; `toContainText(/ SR/)` (L1490) goes from failing-against-source to passing. **Do not "fix" the `/ SR/` regex to `/stars/`.** The 390px mobile overflow test needs no edit (pills live inside the `overflow-x-auto` scroller).
- **Unit**: none exist for these files; none added (pure class/markup changes).

### Verification

Commands per Global Constraints. Visual:

- `/beatmaps/46827` at 390x844: the 3 non-current difficulty entries show icon + name + `N.NN SR`, truncating at max-w-64; horizontal swipe works; active pill still auto-centers on load.
- `/beatmaps/46827` at 1440x1000: navigator identical to today (icon-only 40px squares); hover a square → tooltip `"{name} · N.NN SR"`.
- Skeleton: throttle network in devtools (or reload a cold `/beatmaps/2901604`) at 1440x1000 and 390x844 — the skeleton page's total scroll height approximates the loaded page and the lower grid shows five placeholder cards with the 2-col split at lg; no horizontal layout jump when content arrives.
- No color changes — a glance suffices for themes.

---

## Deferred / flagged

**Skipped items (justified by specs; honored here):**

- **Touch-scroll tooltip dismissal (CONSIDER) — SKIPPED.** Recharts `Tooltip` exposes no imperative dismiss API; forcing `active` from a document-level touch-scroll listener fights Recharts' internal hover state and needs per-chart listeners plus reset bookkeeping. Not cheap, low payoff; the annoyance is also reduced by MUST 7 (no animation means the tooltip no longer appears over a half-drawn chart). Recommend dropping or deferring.

**Flags for controller (carried from the cluster specs):**

- **D1 — Donut tooltip offset has a hard geometric bound** (Task 3). `SectionCard` is `overflow-hidden`, the chart is 200px tall in an 18rem column at the card's right edge, the tooltip panel is ~176px wide — `allowEscapeViewBox` can only escape INTO the card, so total non-overlap of the ring is not always achievable (especially on mobile tap). The task targets the reviewers' actual complaints: never cover the center label, 5-row cap, 24px offset. If verification still shows center-label occlusion, the sanctioned fallback is a fixed `position={{ y: 208 }}` (tooltip parked below the chart, overlapping the legend whose info it duplicates) — that variant visibly changes "follows cursor" behavior, so the controller may want to choose.
- **D2 — Touch-affordance pattern is not uniform across the page, by design.** Synthesis decision: the donut legend rows (Task 3) use `TapTooltip` (hover + focus + tap-to-pin), upgrading the distributions spec's SimpleTooltip choice per the charts spec's recommendation that page consumers converge on TapTooltip. The pool-row ruleset badge (Task 4) and the desktop difficulty squares (Task 9) deliberately keep hover/focus-only `SimpleTooltip`: the badge has an `aria-label` and the mobile difficulty pills print their info inline, so nothing is touch-inaccessible. If the controller wants full uniformity, those two could migrate to TapTooltip later, at the cost of buttons inside/beside links.
- **D3 — Legend-hover slice activation is adapted, not literal** (Task 3). Recharts 3.8 removed the controlled `activeIndex` prop from `Pie`, so growing a slice from a legend event has no supported API. The plan delivers the underlying capability (sliver brackets inspectable via hover/focus/tap on legend rows) without the synchronized slice-grow. Implementers may experiment with Recharts 3's `Tooltip defaultIndex`/`active`, but it is not required and must not block. Literal slice-grow needs a Recharts version investigation first.
- **D4 — MUST 1 "full row width" softened deliberately** (Task 4). On mobile the tournament name shares its line with the games count + toggle (~76px). The literal reading requires either duplicating the aria-labeled count element — corrupting the e2e sort test's `[aria-label$="games"]` reads — or restructuring the desktop grid, risking "desktop unchanged". Name width at 390px still grows from ~66px to ~248px and both reviewer example names render fully. The literal version would need the count moved to the meta line plus `:visible` filtering in the e2e locator.
- **D5 — Review factual correction on SHOULD 10** (Task 4). The review says the ruleset icon is "already used in the expanded panel" — false; `BeatmapPoolGamesPanel` renders `ModIconset`/`TierIcon` only. `RulesetIcon` exists and is used in the page header; the item remains a pure client change.
- **D6 — forceMount side effect** (Task 5). Both Records-card panels are always in the DOM (the 25-row scores table renders even when never opened). The data ships in the RSC payload either way, so the cost is DOM size only; noted because hidden-but-present elements change what `document.querySelectorAll` and future e2e locators see.
- **D7 — SimpleTooltip is deliberately NOT modified** (Task 6). MUST 2's "SimpleTooltip triggers become keyboard-focusable" is delivered by migrating this page's box-plot consumers to the focusable-button `TapTooltip`; rewriting `simple-tooltip.tsx` itself would touch ~30 consumers app-wide, most outside this page.
- **D8 — Intentional desktop side effect of MUST 2** (Task 6). Clicking a box-plot row on desktop now pins a popover (click-to-pin). This exceeds the review's touch-only ask but falls out of the chosen primitive composition and is strictly additive — do not report it as an unintended behavior change.
- **D9 — Pre-existing red e2e assertion** (Task 9). `e2e/beatmaps.e2e.ts` L1490 asserts the difficulty hover tooltip contains `/ SR/`, but the shipped component renders `"… stars"` — that assertion could not pass against current source (or was flaky-skipped via the `if count > 0` guard). Task 9's copy change resolves it in the source direction.
- **D10 — The MUST 5 gate is deliberately narrow** (Task 8): pools AND verified scores both zero. A map with pool records but zero verified scores (or vice versa) keeps today's per-card empty states, per the review's exact wording. Broadening the collapse is a scope extension needing controller sign-off.
- **D11 — MUST 6 wording tension resolved, not flagged** (Task 2). "Align the bar with the Scores-tab badge palette" is implemented as canonical hues for SS/S/A plus monotonic muted grays for B–D (the badges' gold/orange/red B–D hues are NOT copied), per the catch/mania amendments the review's own H2 verdict endorses ("B–D stay achromatic so the bar reads two-signal").
- **D12 — Fixture double duty** (whole plan). `/beatmaps/884085` is both the per-card empty-state fixture (Tasks 2–7) and the collapsed-band fixture (Task 8+). Verification of per-card empty branches on it is only meaningful before Task 8 lands; afterwards those branches remain reachable on partially-empty maps (pools without verified scores or vice versa) and via code review.

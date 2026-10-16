# Colour and charts

The colour tokens the library adds, the domain palettes (mods, tiers, grades, star rating, verification, teams), and the shared chart parts: one tick rule, axis formatters, Recharts axis props, one tooltip and one legend.
Tokens live in `apps/web/app/globals.css`; every value is mirrored, with its light and dark hex, in `@/lib/kit/color/` and unit-tested for contrast. Chart helpers are in `@/lib/kit/charts/`, chart components in `@/components/kit/charts/`.

- [Rules at a glance](#rules-at-a-glance)
- [Theme tokens](#theme-tokens): every token, its class, light and dark values
- [Brand blue](#brand-blue): `primary`, `primary-solid` and `link`
- [Accent rule](#accent-rule): what blue is for
- [Categorical palette](#categorical-palette): `CATEGORICAL_PALETTE`, `seriesColor`
- [Verification colours](#verification-colours): `getStatusHueColor`, `getRatingsGroupColor`
- [Callout tones](#callout-tones): `bg-callout-*`, `CALLOUT_COLORS`
- [Match teams and surfaces](#match-teams-and-surfaces): `MATCH_TEAM_COLORS`, `bg-game-frame`, `bg-score-card`
- [Tier colours](#tier-colours): `TIER_PALETTE`, `TIER_TEXT_CLASS`
- [Grade colours](#grade-colours): `GRADE_PALETTE`, `getGradeColor`
- [Mod colours](#mod-colours): `MOD_PALETTE`, `getModPaletteColor`
- [Star rating colours](#star-rating-colours): `getStarRatingMarkColor`
- [Contrast helpers](#contrast-helpers): `contrastRatio`, `colorDistance`
- [Tick rule](#tick-rule): `getNiceTicks`, `getTimeTicks`
- [Axis formatters](#axis-formatters): `formatCountTick`, `formatYearTick` and friends
- [Recharts axis props](#recharts-axis-props): `chartAxisProps`, `chartValueAxisProps`, `niceAxisProps`
- [ChartTooltipContent](#charttooltipcontent): the one chart tooltip
- [ChartLegend and SeriesMarker](#chartlegend-and-seriesmarker): the key for two or more series
- [Chart card](#chart-card): Panel, SectionHeader and a chart

## Rules at a glance

- Text is coloured only with semantic tokens: `text-foreground`, `text-muted-foreground`, the `*-foreground` status tokens, `text-callout-*-foreground`, `text-match-*-foreground` and `text-tier-*`. Never a palette class such as `text-orange-500`, never a hex value in a component.
- A domain palette (mods, tiers, grades, star rating, verification, teams) is reached through its helper in `@/lib/kit/color/`, which returns `var(--…)`. Never copy a palette value into a component.
- Marks and icons clear 3:1 against the card, text 4.5:1, in both themes. The tests in `apps/web/lib/kit/color/__tests__/` enforce it for every token; a new token goes into `globals.css` and the matching module together, or the tests fail.
- Colour never carries meaning alone: a status has its glyph, a series has its legend or label, a mod has its name.
- Neutral series take the categorical palette in order. Status colours only ever mean status.
- Every chart sits in a Panel with a SectionHeader, inside `ChartContainer`, with the shared tick rule, axis props, formatters and `ChartTooltipContent`.

## Theme tokens

Every token below has a light value in `:root` and a dark value in `.dark`; the modules named in the table hold the per-entry values. "Mark" means 3:1 against the card, "text" 4.5:1. The class column is the Tailwind colour name (`bg-…`, `text-…`, `border-…`, `fill-…`); tokens without a class are used through their helper.

| Token                                  | Class                        | Light       | Dark        | Use                                      |
| -------------------------------------- | ---------------------------- | ----------- | ----------- | ---------------------------------------- |
| `--series-1` … `--series-8`            | `series-1` … `series-8`      | below       | below       | Categorical chart marks                  |
| `--series-other`                       | `series-other`               | `#7a7a7a`   | `#929292`   | The "Other" series or bucket             |
| `--verification-verified`              | `verification-verified`      | `#25984d`   | `#47c86e`   | Verified icon and chart fill             |
| `--verification-neutral`               | `verification-neutral`       | `#7a7a7a`   | `#929292`   | Pending icon, "Not in ratings yet" fill  |
| `--verification-rejected`              | `verification-rejected`      | `#d73431`   | `#f66d67`   | Rejected icon and chart fill             |
| `--callout-info`                       | `callout-info`               | `#f0f6fc`   | `#1b2026`   | Info callout fill                        |
| `--callout-info-border`                | `callout-info-border`        | `#c9daeb`   | `#344458`   | Info callout border                      |
| `--callout-info-foreground`            | `callout-info-foreground`    | `#314968`   | `#bcd3f2`   | Info callout text and icon               |
| `--callout-warning`                    | `callout-warning`            | `#fff6e1`   | `#2b1f0d`   | Warning callout fill                     |
| `--callout-warning-border`             | `callout-warning-border`     | `#ebc573`   | `#724d0b`   | Warning callout border                   |
| `--callout-warning-foreground`         | `callout-warning-foreground` | `#864900`   | `#f8cf68`   | Warning callout text and icon            |
| `--callout-danger`                     | `callout-danger`             | `#fff1f1`   | `#301717`   | Danger callout fill                      |
| `--callout-danger-border`              | `callout-danger-border`      | `#f9bcb9`   | `#893130`   | Danger callout border                    |
| `--callout-danger-foreground`          | `callout-danger-foreground`  | `#b7191c`   | `#ff9e9b`   | Danger callout text and icon             |
| `--match-red`                          | `match-red`                  | `#e34948`   | `#e66767`   | Red team edge, tint, swatch, chart line  |
| `--match-red-foreground`               | `match-red-foreground`       | `#cc3135`   | `#f17070`   | Red team text                            |
| `--match-blue`                         | `match-blue`                 | `#4589f2`   | `#4e93fc`   | Blue team edge, tint, swatch, chart line |
| `--match-blue-foreground`              | `match-blue-foreground`      | `#276bd1`   | `#579dff`   | Blue team text                           |
| `--match-no-team`                      | `match-no-team`              | `#747474`   | `#9e9e9e`   | Scores with no team                      |
| `--game-frame`                         | `game-frame`                 | `#f4f4f4`   | `#141414`   | Recessed frame around a game's scores    |
| `--score-card`                         | `score-card`                 | `#ffffff`   | `#242424`   | Score card inside the game frame         |
| `--notification`                       | `notification`               | `#4589f2`   | `#4e93fc`   | The one notification dot                 |
| `--tier-<tier>`                        | `tier-<tier>`                | `tiers.ts`  | `tiers.ts`  | Tier names (text) and tier chart marks   |
| `--score-grade-ss` … `--score-grade-d` | none                         | `grades.ts` | `grades.ts` | Grade chart marks                        |
| `--mod-nm` … `--mod-key`               | none                         | `mods.ts`   | `mods.ts`   | Mod marks and solid mod pills            |

The existing tokens (`muted`, `success`, `warning`, `destructive`, `chart-1` … `chart-5` and the rest) keep their values. The legacy palettes that pages still read (`--mod-hard-rock` and the other long mod names, `--text-<tier>` with the `.text-gold` utilities, `--grade-*`, `--rank-range-*`, `--team-red`, `--team-blue`, `--team-no-team`, `--color-status-*`) are replaced by the tokens above in the second pull request; don't use them in new code.

A light subtree inside a dark page (`.theme-light`, the gallery only) gets the light values of every token above, and of `success` and `warning`.

Gallery anchor: `/admin/design#color`

## Brand blue

Three tokens carry the brand blue, because one blue can't be both a fill behind white text and readable text in both themes.

| Token             | Class                                 | Light     | Dark                     | Use for                                              |
| ----------------- | ------------------------------------- | --------- | ------------------------ | ---------------------------------------------------- |
| `--primary`       | `text-primary`, `border-primary`, ... | `#3a71e2` | `#4e93fc` (the original) | Icons, borders, the focus ring, selected tints       |
| `--primary-solid` | `bg-primary-solid`                    | `#3a71e2` | `#3a71e2`                | Fills behind white text: buttons, solid badges, days |
| `--link`          | `text-link`                           | `#356ad4` | `#4e93fc` (the original) | Blue text: links on hover, row titles on hover       |

- White text on `primary-solid` measures 4.5:1 in both themes. In light mode `#3a71e2` is the passing blue closest to the original `#4e93fc`, which only reached 3:1 with white text.
- `link` reaches 4.5:1 on the background, cards and grey panels in both themes. Light mode needs it a step darker than `primary` for that; dark mode keeps the original blue.
- `primary` is a mark colour: 3:1 or better on every surface, in both themes.

Do:

- Put white text (`text-primary-foreground`) only on `bg-primary-solid`. The shadcn and kit buttons and the solid badge already do.
- Colour blue text with `text-link`, including hover states on names and row titles.

Don't:

- Don't put white text on `bg-primary`: in dark mode it is the original blue, 3:1 with white.
- Don't colour text `text-primary`; it is under 4.5:1 on light cards. Pages still doing it move to `text-link` in the second pull request.

## Accent rule

Blue (`primary`) means "you can act on this" or "this is selected". Nothing decorative is blue.

- Blue: primary buttons, a selected chip, tab or toggle, the focus ring, links on hover (`hover:text-link`, or `hover:underline` on dense rows), and the notification dot.
- Not blue: section and page icons (`text-muted-foreground`), names at rest (they are `text-foreground` links that turn blue on hover), headings, trophies and other decorative icons, and info callouts (they use the slate `callout-info` tone).
- One notification dot colour: `bg-notification`, through `NotificationDot` from `@/components/kit/status/NotificationDot`.
- Blue that is not interactive is data, never decoration: a single chart series (`--series-1`, the brand blue stepped to clear 3:1 on light cards), the blue team (`match-blue`) and the notification dot. Of these only the blue team's score is ever text.

Do:

- Use `text-muted-foreground` on every SectionHeader and PageHeader icon.
- Make a name a link with `transition-colors hover:text-link` and the standard focus ring.

Don't:

- Don't colour section icons `text-primary` (most non-beatmap pages today, such as `components/player/PlayerTournamentsList.tsx`, `components/tournaments/TournamentRatingsView.tsx`, `components/filtering/FilterReportView.tsx`, `components/stats/*Chart.tsx`).
- Don't colour every name in an event as a link (`components/audit/*`); only real links, and only on hover.
- Don't use a second dot colour: `bg-blue-500` in `components/profile/ProfileCard.tsx` and `app/reports/MyReportsClient.tsx`, `bg-yellow-600 dark:bg-yellow-400` in `components/admin-notes/AdminNoteView.tsx` all become `NotificationDot`.
- Don't use blue for an info notice (`components/filtering/FilterComplianceNotice.tsx`, `components/audit/CascadeContextBanner.tsx`).

Gallery anchor: `/admin/design#color-accent-rule`

## Categorical palette

Eight hues in a fixed order for neutral series: rank ranges, teams (red and blue), rulesets, teammates and opponents, any "series 1, 2, 3". The order keeps neighbours apart for protanopia and deuteranopia (Machado 2009 simulation, adjacent OKLab ΔE ≥ 8) and for full colour vision (ΔE ≥ 15), in both themes; the tests check it.

```tsx
import {
  CATEGORICAL_PALETTE,
  CATEGORICAL_OTHER,
  seriesColor,
} from '@/lib/kit/color/categorical';

<Bar dataKey="osu" fill={seriesColor(0)} />;
```

| Slot | Name    | Light     | Dark      |
| ---- | ------- | --------- | --------- |
| 1    | Blue    | `#4589f2` | `#4e93fc` |
| 2    | Orange  | `#e6632f` | `#d95926` |
| 3    | Aqua    | `#049e6d` | `#199e70` |
| 4    | Yellow  | `#bd7f03` | `#c98500` |
| 5    | Magenta | `#d36992` | `#d55181` |
| 6    | Green   | `#008300` | `#008300` |
| 7    | Violet  | `#4a3aa7` | `#9085e9` |
| 8    | Red     | `#e34948` | `#e66767` |

- `seriesColor(index)`: `var(--series-N)` for a 0-based index; past the eighth slot it returns the "Other" grey, never a repeat.
- `CATEGORICAL_PALETTE`: the slots with `token`, `css`, `light`, `dark`, `slot` and `name`. `CATEGORICAL_OTHER` is the grey for an "Other" bucket.
- Assign by a stable index (the series' place in a fixed list), not by rank, so a filter that removes a series never repaints the others.
- A single series is slot 1 and needs no legend. Two or more get a `ChartLegend`.
- In scatter plots and small multiples any two colours can touch, so use at most three slots there and fold the rest into "Other".
- Rank ranges keep their symbol and dash pattern from `lib/beatmaps/rankRange.ts` as the second channel.

Do:

- Rank ranges take slots 1 to 5 in bucket order (Open, <1k, 1k+, 10k+, 100k+).
- Teammates and opponents take slots 1 and 2.

Don't:

- Don't give neutral data a judgement colour: `components/player/PlayerFrequencyChart.tsx` paints teammates blue (`--chart-1`) and opponents red (`--chart-2`).
- Don't invent series colours: the rating chart's `#3b82f6` and `#8b5cf6` in `components/player/PlayerRatingChartView.tsx`, `--rank-range-*` in `globals.css`.
- Don't reuse a status colour for a series, or a series colour for a status.

Gallery anchor: `/admin/design#color-categorical-palette`

## Verification colours

Green, neutral and red for status icons and chart fills, keyed by the status hue from `@/lib/kit/status/verification` (see the status reference). Icons keep the outcome hue (Pre-verified green, Pre-rejected red); charts group Pending, Pre-verified and Pre-rejected into one neutral "Not in ratings yet" bar.

```tsx
import { RATINGS_GROUPS } from '@/lib/kit/status/verification';
import {
  getRatingsGroupColor,
  getStatusHueColor,
  getVerificationStatusColor,
} from '@/lib/kit/color/verification';

{
  RATINGS_GROUPS.map((group) => (
    <Cell key={group.key} fill={getStatusHueColor(group.hue)} />
  ));
}
```

- `getStatusHueColor(hue)`: `success`, `neutral` or `destructive` to its `var(--verification-…)`.
- `getRatingsGroupColor(status)`: the chart fill for a status (neutral for the three undecided states).
- `getVerificationStatusColor(status)`: the icon colour for a status. `VerificationStatusIcon` already uses the `text-verification-*` classes; reach for this only in SVG or chart code.
- `VERIFICATION_COLORS`: the three `ThemeColor` entries.

Don't:

- Don't use `--color-status-awaiting` (yellow) or a separate Pending bar: `components/stats/TournamentVerificationChart.tsx` does both, and labels the group "Awaiting Review".
- Don't use `success`/`destructive` fills or `green-400`/`yellow-400` for verification in charts.

Gallery anchor: `/admin/design#color-verification`

## Callout tones

Fill, border and text-plus-icon for the info, warning and danger callouts. The callout component (feedback family) uses them; use the tokens directly only when building a new tone-carrying surface.

```tsx
<div className="rounded-lg border border-callout-warning-border bg-callout-warning px-3 py-2 text-sm text-callout-warning-foreground">
  …
</div>
```

- `CALLOUT_COLORS[tone]` in `@/lib/kit/color/tokens` has `fill`, `border` and `foreground` for `info`, `warning` and `danger`.
- The foreground clears 4.5:1 on its fill, and so do `text-foreground` and `text-muted-foreground`, so a link or muted line inside a callout stays legible.
- Info is a quiet slate, not the link blue.

Don't:

- Don't build notices from palette classes: `border-orange-500/50 bg-orange-500/15` in `app/tools/filter/FilteringPageClient.tsx` and `components/banner/MaintenanceBanner.tsx`, `bg-blue-50/50` in `components/filtering/FilterComplianceNotice.tsx`, `bg-amber-50/30` in `components/audit/AuditNoteItem.tsx`.

Gallery anchor: `/admin/design#color-callout-tones`

## Match teams and surfaces

One red and blue pair for match teams everywhere (the categorical red and blue), a text step of each for team-coloured numbers and the result line, a theme-aware grey for scores with no team, and the two match page surfaces: a recessed game frame with lighter score cards, each card tinted with its team.

```tsx
import { Team } from '@otr/core/osu';
import {
  MATCH_TEAM_COLORS,
  getTeamColor,
  getTeamTextColor,
  getTeamTintClass,
} from '@/lib/kit/color/teams';

<div className="rounded-xl border bg-game-frame p-3">
  <div className="relative flex overflow-clip rounded-lg border bg-score-card">
    <span className={cn('absolute inset-0', getTeamTintClass(score.team))} aria-hidden />
    <span className="relative w-1.5 opacity-70" style={{ backgroundColor: getTeamColor(score.team) }} aria-hidden />
    …
    <span style={{ color: getTeamTextColor(score.team) }}>{formatCount(score.score)}</span>
  </div>
</div>
<p className="text-match-red-foreground">Team Red wins by 34,509</p>
```

- `getTeamColor(team)`: the mark colour (`--match-red`, `--match-blue`, `--match-no-team`) for the edge, swatches and chart lines.
- `getTeamTextColor(team)`: the text step; `var(--foreground)` for no team.
- `getTeamTintClass(team)` / `MATCH_TEAM_TINT_CLASS`: the card tint, `bg-match-red/6` and so on. `MATCH_TEAM_TINT` (6%) is the strength the tests check.
- Classes: `bg-match-red`, `text-match-red-foreground`, `bg-game-frame`, `bg-score-card`.
- Foreground, muted and team text clear 4.5:1 on the game frame, the score card and the tinted score card, in both themes.

Do:

- Keep the score card layout, team tint, coloured edge and result line (owner decision, 15 Oct); only the surfaces and colours change.
- Use the standard `border` on both surfaces.

Don't:

- Don't hard-code the surfaces: `bg-white dark:bg-neutral-800` and `border-neutral-300` in `components/games/ScoreCard.tsx`, `bg-secondary` in `components/games/GameCard.tsx`.
- Don't tint at 10% as `ScoreCard.tsx` does today (`bg-[var(--team-color)]/10`): muted text on the light card drops under 4.5:1.
- Don't use deeper reds and blues for the same teams: `bg-red-500/10 text-red-600` in `components/tournaments/MatchLedgerRow.tsx`, `text-red-600 dark:text-red-400` on the outcome in `GameCard.tsx`.
- Don't use `--team-no-team: #333`, which is not theme-aware.

Gallery anchor: `/admin/design#color-match`

## Tier colours

Tier names as text, stepped per theme to clear 4.5:1 (light gold and emerald were 1.9:1). The same colours mark tier rows in charts.

```tsx
import { TIER_PALETTE, TIER_TEXT_CLASS, getTierColor } from '@/lib/kit/color/tiers';

<span className={TIER_TEXT_CLASS[tier]}>{getTierString(tier, subTier)}</span>
<BoxPlotTrack color={getTierColor(tier)} … />
```

- `TIER_TEXT_CLASS[tier]`: the `text-tier-…` class, spelled out so Tailwind finds it.
- `getTierColor(tier)` / `TIER_PALETTE[tier].css`: the colour for a fill or SVG. This is not the `getTierColor` in `lib/utils/tierData.ts`, which returns the legacy text class and glow; alias one of them when a file needs both.
- Tier glows (`tierColors[…].gradient` in `lib/utils/tierData.ts`) are decoration and stay.

Don't:

- Don't use `tierColors[…].textClass` (`.text-gold` and friends over `--text-<tier>`) or `TIER_CHART_COLOR` in `components/beatmap/BeatmapTierBreakdownCard.tsx` in new code.

Gallery anchor: `/admin/design#color-tiers`

## Grade colours

Marks for grade charts and swatches. SS, S and A keep the osu! badge hues (stepped darker on light cards); B to D are a grey ramp that recedes toward the card in both themes.

```tsx
import { GRADE_PALETTE, getGradeColor } from '@/lib/kit/color/grades';

<Bar fill={getGradeColor(ScoreGrade.A)} />;
```

- `getGradeColor(scoreGrade)`: folds SSH into SS and SH into S, as the badges do.
- `GRADE_PALETTE[key]`: `SS`, `S`, `A`, `B`, `C`, `D`.

Don't:

- Don't use `--grade-*` (`components/beatmap/BeatmapDistributionsCard.tsx`); its light S and A are 2.4:1 and 1.6:1.

Gallery anchor: `/admin/design#color-grades`

## Mod colours

The revised mod palette. No Mod has its own colour (it used to fall back to the link blue), Sudden Death and Touch Device differ, every mod clears 3:1 on both cards, and every mod takes black text as a solid pill. Rare combinations get the "Other" grey.

```tsx
import { MOD_FILL_FOREGROUND, getModPaletteColor } from '@/lib/kit/color/mods';

<span
  className="inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold"
  style={{
    backgroundColor: getModPaletteColor(mods),
    color: MOD_FILL_FOREGROUND,
  }}
>
  {getBeatmapModLabel(mods)}
</span>;
```

- `getModPaletteColor(mods)`: applies the display rules first (NF and SO dropped, NC shown as DT), then returns `var(--mod-…)` or the "Other" grey.
- `getModPaletteEntry(mods)`: the entry with its `label`, `light` and `dark`, or undefined.
- `MOD_PALETTE`: labelled as the beatmap pages label them (`getBeatmapModLabel`): NM, HD, HR, DT, HT, EZ, FL, HDHR, EZHD, EZDT, HDFL, HDDT, SD, TD, RX (relax and autoplay), MR, RD and KEY (mania keys).
- `MOD_FILL_FOREGROUND`: black, the text colour on every solid mod fill.
- Mod labels and lists come from the format family (`formatMods`, `getBeatmapModLabel`).

Don't:

- Don't use `getModColor` and `getModForegroundColor` from `lib/utils/mods.ts` or the `--mod-hard-rock` style tokens in new code. They give No Mod and unknown combinations `--chart-1` (the link blue), give SD and TD the same orange, and several drop under 3:1 on light cards. All five mod charts and `components/beatmaps/BeatmapTopMods.tsx` switch in the second pull request.

Gallery anchor: `/admin/design#color-mods`

## Star rating colours

osu!'s difficulty spectrum. As a solid pill it keeps its exact colour with a black or white label (always 4.5:1); as an icon, text tint or chart mark on a card it is stepped darker in light mode and lighter in dark mode to clear 3:1.

```tsx
import {
  getStarRatingColor,
  getStarRatingForegroundColor,
  getStarRatingMarkColor,
} from '@/lib/kit/color/star-rating';

<span style={{ backgroundColor: getStarRatingColor(sr), color: getStarRatingForegroundColor(sr) }}>…</span>
<Star style={{ color: getStarRatingMarkColor(sr) }} />
```

- `getStarRatingMarkColor(sr)` returns `light-dark(<light>, <dark>)`, which follows the theme's `color-scheme`. Use it in `style`, not in an SVG presentation attribute.
- `getStarRatingMarkColors(sr)`: `{ light, dark }` hex, for code that knows its theme.

Don't:

- Don't use `getStarRatingIconColor` from `lib/beatmaps/star-rating-color.ts` on light cards; it only clamps for dark ones.

Gallery anchor: `/admin/design#color-star-rating`

## Contrast helpers

Pure colour maths in `@/lib/kit/color/contrast` and `@/lib/kit/color/cvd`, for tests and for checking a new colour before it lands.

```ts
import { CONTRAST_MARK, contrastRatio } from '@/lib/kit/color/contrast';
import { SURFACES } from '@/lib/kit/color/surfaces';

contrastRatio('#4589f2', SURFACES.light.card) >= CONTRAST_MARK;
```

- `parseColor` reads hex, `rgb()`, `hsl()` and `oklch()`; `contrastRatio(fg, bg)` is WCAG 2 (a translucent foreground is painted over the background first); `formatContrast` rounds down.
- `colorDistance(a, b, vision)`: OKLab ΔE ×100 for `normal`, `protan` or `deutan` readers; `worstAdjacentDistance` checks a palette's neighbours.
- `SURFACES`: the light card (`--card`) and the dark panel (`--muted` at 75% over `--background`), plus each theme's muted surface. `TEXT_COLORS`: each theme's foreground and muted text. A test resolves both from `globals.css`.

Adding a colour token: add it to both blocks in `globals.css` (and to `@theme inline` if it needs a class), add the `themeColor(...)` entry to its module and to `TOKEN_GROUPS` in `@/lib/kit/color/tokens`, run `bun test apps/web/lib/kit/color`, and check the gallery.

## Tick rule

One tick rule site-wide: steps of 1, 2, 2.5 or 5 times a power of ten (the beatmap pages' steps), the densest that fits, at most six ticks. A horizontal axis (time, histogram buckets, box plot scales) drops to four on phones, where its labels would collide; a vertical value axis keeps six, as the beatmap charts do.

```ts
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getNiceTicks,
  getTimeTicks,
} from '@/lib/kit/charts/ticks';

const y = getNiceTicks(0, maxCount, { integer: true });
// { min: 0, max: 1500, step: 500, ticks: [0, 500, 1000, 1500] }
const maxTicks = useIsNarrowChart() ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS;
const x = getTimeTicks(firstTimestamp, lastTimestamp, maxTicks);
```

- `getNiceTicks(min, max, options)`: covers the data with round ticks. Non-negative data never gets a negative tick; bar charts pass `0` as `min`.
  - `integer`: whole steps only, for counts.
  - `within`: keep the domain on the data and put ticks only inside it, for category axes, histogram buckets and `dataMin`–`dataMax` axes.
  - `maxTicks`: 6 by default; on a horizontal axis pass `NARROW_MAX_TICKS` below `sm` (`useIsNarrowChart` from `@/lib/hooks/useMediaQuery`).
  - A flat series is padded, so the axis never collapses.
- `getTimeTicks(minTime, maxTime, maxTicks)`: ticks on UTC calendar boundaries (days, then 1, 2, 3 or 6 months counted from January, then years), with the `unit` to format them.
- `getNiceAxis` and friends in `lib/beatmaps/chart-axis.ts` follow the same rule; the beatmap box plots and scales keep using them.

Don't:

- Don't write a local tick rule. The rating chart's `calculateReadableTickInterval` (`components/player/PlayerRatingChartView.tsx`) scales by powers of 5 and produces steps such as 13 and 125; its time axis spaces ticks evenly between arbitrary timestamps.
- Don't hard-code ticks (`components/player/PlayerModStatsChart.tsx`, `components/matches/MatchTeamScoresChart.tsx`, the `roundToNice` in `components/stats/TournamentsByYearChart.tsx`).
- Don't leave a value axis to Recharts' automatic ticks: the beatmap Misses chart (`components/beatmap/BeatmapPerformanceCard.tsx`) gets steps of 150 that way. Pass `niceAxisProps(getNiceTicks(…))`.

Gallery anchor: `/admin/design#color-chart-ticks`

## Axis formatters

Recharts `tickFormatter`s and tooltip value formats. Counts and quantities get thousands separators; years and IDs never do. They wrap the format family's `formatCount`, `formatNumber`, `formatYear` and `formatId`, so a chart prints what the table beside it prints.

```ts
import {
  formatCompactTick,
  formatCountTick,
  formatIdTick,
  formatNumberTick,
  formatPercentTick,
  formatTimeTick,
  formatYearTick,
} from '@/lib/kit/charts/format';
```

| Formatter           | Output                       | For                                   |
| ------------------- | ---------------------------- | ------------------------------------- |
| `formatCountTick`   | `12,345`                     | Counts: tournaments, players, scores  |
| `formatNumberTick`  | `1,250`, `0.25`              | Ratings and other quantities          |
| `formatCompactTick` | `950`, `250k`, `1.25M`       | Score axes                            |
| `formatPercentTick` | `95%`, `97.5%`               | Values already in percent             |
| `formatYearTick`    | `2024`                       | Year axes and labels                  |
| `formatIdTick`      | `1234567`                    | IDs                                   |
| `formatTimeTick`    | `Jul 20`, `Jul 2024`, `2024` | Time axes, with `getTimeTicks().unit` |

Don't:

- Don't use `formatChartNumber` from `lib/utils/chart.ts` (locale-dependent `toLocaleString()`), date-fns `format()` (local time) or a bare `String(value)` on a count axis (the year, ruleset and lobby-size stats charts today).

## Recharts axis props

Shared props so every axis looks the same: 12px muted Inter labels, no tick marks or axis line, dashed horizontal gridlines.

```tsx
import {
  CHART_BAR_RADIUS,
  CHART_CURSOR,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  chartAxisProps,
  chartGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';

<BarChart data={data} margin={CHART_MARGIN}>
  <CartesianGrid {...chartGridProps} />
  <XAxis {...chartAxisProps} dataKey="year" tickFormatter={formatYearTick} />
  <YAxis
    {...chartValueAxisProps}
    {...niceAxisProps(getNiceTicks(0, max, { integer: true }))}
    tickFormatter={formatCountTick}
  />
  <ChartTooltip
    cursor={CHART_CURSOR.bar}
    content={<ChartTooltipContent valueFormatter={formatCountTick} />}
  />
  <Bar dataKey="count" fill={seriesColor(0)} radius={CHART_BAR_RADIUS} />
</BarChart>;
```

- `chartAxisProps`: for any axis. `chartValueAxisProps` adds `width: 'auto'` for the value axis on the left.
- `niceAxisProps(ticks)`: `type`, `domain`, `ticks`, `interval: 0` and `allowDecimals` from `getNiceTicks`.
- `chartGridProps`: dashed, horizontal only. `ChartContainer` paints it in the border colour at half strength, so always render inside `ChartContainer` (`@/components/ui/chart`).
- `CHART_BAR_RADIUS` (4px data ends, square at the baseline), `CHART_LINE_WIDTH` (2px), `CHART_MARGIN`, `CHART_CURSOR.bar` and `.line`.
- Stacked bars: a 1px `stroke="var(--card)"` separates segments; round only the top series.
- `CHART_CURSOR.bar` is the muted band `ChartContainer` already paints; pass it anyway so the intent is explicit.
- Turn off animation (`isAnimationActive={false}`) as the beatmap charts do.

Don't:

- Don't render Recharts outside `ChartContainer` (`components/stats/TournamentsByYearChart.tsx` uses a bare `ResponsiveContainer`, so its labels fall back to 16px and `#666`).
- Don't set tick font sizes or colours per chart (`fontSize: 14` and `fill: 'var(--foreground)'` in `components/stats/TournamentVerificationChart.tsx`).

## ChartTooltipContent

The one chart tooltip: an optional title, one row per series (marker, muted name, value right-aligned) and an optional footer, on the same card the beatmap charts use. It is the content of the `ChartTooltip` from `@/components/ui/chart` (Recharts' `Tooltip`), the same pairing the beatmap charts use, and it replaces the shadcn `ChartTooltipContent` from that file.

```tsx
import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { ChartTooltip } from '@/components/ui/chart';

<ChartTooltip
  cursor={CHART_CURSOR.bar}
  content={
    <ChartTooltipContent
      reverse
      labelFormatter={(label) => formatYearTick(label)}
      nameFormatter={(key) => RULESET_LABELS[key]}
      valueFormatter={formatCountTick}
      footer={(payload) => `Total ${formatCountTick(sum(payload))}`}
    />
  }
/>;
```

- Pass it as the tooltip's `content`; Recharts fills in `active`, `payload` and `label`. Rendered on its own inside a chart it shows nothing.
- `labelFormatter`: the title from the hovered x value. `valueFormatter`: each value, usually an axis formatter; `formatNumberTick` by default. `nameFormatter`: series key to display name.
- The marker takes the series' `fill` (or a line's `stroke`). Bars coloured per `Cell` have no series fill, so give each data row a `fill` field, as the beatmap mod charts do, and the marker uses it.
- `marker`: `square` (default), `line`, `dashed` or `dot`, matching the mark.
- `reverse`: list a vertical stack top to bottom. `footer`: a total or a note.
- `ChartTooltipBody`: the same readout without the card, for a `TapTooltip` around a chart drawn without Recharts (box plots). `ChartTooltipCard`: the card around it, for static use.

Don't:

- Don't write a per-chart tooltip component (`CustomTooltip` in `components/stats/TournamentsByYearChart.tsx`, `components/player/PlayerRatingChartTooltip.tsx`).
- Don't import the shadcn `ChartTooltipContent` from `@/components/ui/chart` in new charts (the beatmap cards still do); its values follow the visitor's locale.
- Don't print values with `toLocaleString()`; pass a formatter.

Gallery anchor: `/admin/design#color-chart-tooltip`

## ChartLegend and SeriesMarker

The key for a chart with two or more series: a marker in the series colour and a muted 12px name, above the plot, in series order.

```tsx
import { ChartLegend } from '@/components/kit/charts/ChartLegend';
import { SeriesMarker } from '@/components/kit/charts/SeriesMarker';

<ChartLegend
  items={RULESETS.map((ruleset, index) => ({
    key: ruleset.key,
    label: ruleset.label,
    color: seriesColor(index),
  }))}
/>;
```

- `items`: `key`, `label`, `color` and an optional `marker`. `marker` on the legend sets the default.
- `SeriesMarker`: the marker on its own, for direct labels and custom rows. `square` for bars and areas, `line` for lines, `dashed` for reference and trend lines, `dot` for points.
- A single series needs no legend; the SectionHeader title names it. With four or fewer series, direct labels on the marks are a good addition.
- The legend's text stays muted; the marker carries the colour.

Don't:

- Don't use Recharts' default `<Legend />` (`components/player/PlayerRatingChartView.tsx`), which renders below the plot in the series colour.

Gallery anchor: `/admin/design#color-chart-legend`

## Chart card

A chart sits in a Panel with a SectionHeader, never in a card of its own. There is no separate chart card component; compose the layout family's parts.

```tsx
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { ChartContainer } from '@/components/ui/chart';

<Panel>
  <SectionHeader
    icon={ChartColumn}
    title="Tournaments by year"
    meta="8,042 verified"
    infoText="Verified tournaments, by the year they started."
  />
  <PanelBody className="flex flex-col gap-3">
    <ChartLegend items={…} />
    <ChartContainer config={{}} className="aspect-auto h-60 w-full">
      <BarChart …>…</BarChart>
    </ChartContainer>
  </PanelBody>
</Panel>;
```

- The SectionHeader icon is muted, the title is the chart's name in sentence case, the meta is a short count or the peak, and the info button explains how to read the chart.
- The legend goes at the top of the body; the plot is 240px tall (`h-60`) unless the chart needs more.
- Empty data uses the shared empty state inside the same panel.

Don't:

- Don't use `Card`, `CardHeader` and `CardDescription` with a 24px blue icon for charts (every chart in `components/stats/` and the player charts today).

Gallery anchors: `/admin/design#color-chart-line`, `/admin/design#color-chart-bar`, `/admin/design#color-chart-stacked`, `/admin/design#color-chart-distribution`

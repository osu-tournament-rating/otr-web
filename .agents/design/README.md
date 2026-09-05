# o!TR interface references

Use this guide to choose and review patterns. Read the affected components and
inspect the relevant local page before proposing a new visual treatment. Existing
code establishes behavior; an arbitrary existing page does not establish the
design standard.

## Reference selection

The beatmap detail and list pages are the primary visual references. Player pages
are supporting references for profiles, rating history, chart/table controls,
and tournament history. Match the polished patterns in these pages when
modernizing another surface. Do not preserve a legacy pattern merely because
it appears elsewhere on the site.

| Reference         | Use it for                                                           | Source                                                             |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/beatmaps/:id`   | Section hierarchy, metric density, chart treatment, score tables     | `apps/web/components/beatmap/`                                     |
| `/beatmaps`       | Page shell, filtering, layout controls, list/table alternatives      | `apps/web/components/beatmaps/` and `apps/web/app/beatmaps/`       |
| `/players/:id`    | Profile metrics, rating history, contextual controls, history tables | `apps/web/components/player/`                                      |
| Discord `/player` | Compact message hierarchy and efficient navigation                   | `apps/discord-bot/src/views/player.ts`; read the app's `AGENTS.md` |

The web references were inspected locally at commit
`9a06df45faaf88a8747288bb6a4cdb46f67d4248`, using snapshot data with current
migrations. Representative records were `/beatmaps/667843` and `/players/440`.
Those IDs are examples, not required fixtures in every database. The Discord
reference was inspected as source, fixture payload, and rendered chart at
`2cfe904f8427356e94054ea941dac8579b0d62de`; that is not an inspection of Discord's
actual message layout. Locate the current branch when an app or pattern is absent
from the checkout.

## What to preserve

- Compact, readable sections with clear boundaries and restrained borders.
- Neutral surfaces, subdued secondary text, and blue primary emphasis.
- Related metrics grouped together; numeric values aligned for comparison.
- Controls beside the section or view they affect.
- A clear information hierarchy at both desktop and narrow widths.
- Domain colors that keep the same meaning across pages, tables, and charts.

Density is useful information per unit of space, not the smallest possible type.
Remove repeated labels and unnecessary framing before reducing readability.
Use an icon or metadata count when it communicates something; not every header
needs both. Reuse the approved pattern for the actual job rather than copying
an entire page's component tree.

## Reusable patterns

Paths below are relative to `apps/web/`.

| Need                               | Start here                                                                       | Preserve                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Section and metric surfaces        | `components/beatmap/BeatmapSection.tsx`                                          | `SectionCard`, `SectionHeader`, `Tile`, `TileStat`, restrained header bands    |
| Inline beatmap metrics and pills   | `components/beatmaps/BeatmapMetric.tsx`, `components/beatmaps/pill.ts`           | Established sizing and surface variants                                        |
| Filters                            | `components/filters/`                                                            | Filter chips, popovers, range fields, deferred application                     |
| Chart foundation                   | `components/ui/chart.tsx`                                                        | Shared container, tooltip, theme treatment, readable axes                      |
| Numeric distributions              | `components/beatmap/BeatmapScoreDistributionCard.tsx`                            | Stable dimensions, subdued grids, clear sample size                            |
| Box plots                          | `components/beatmap/BeatmapSection.tsx`                                          | Shared track, axis, range toggle, five-number tooltip                          |
| Dense score table                  | `components/beatmap/BeatmapLeaderboardCard.tsx`                                  | Muted header, restrained row hover, aligned numbers, narrow-width presentation |
| Rating/history tables              | `components/player/PlayerRatingChartTable.tsx`, `PlayerTournamentMatchTable.tsx` | Contextual chart/table switch, meaningful change colors                        |
| Table foundation                   | `components/ui/table.tsx`, `lib/utils/table.ts`                                  | Shared sticky-header behavior and opaque header surfaces                       |
| Tooltip on a standalone icon       | `components/tap-tooltip.tsx`                                                     | Hover, keyboard, and touch access to the same content                          |
| Existing focusable tooltip trigger | `components/simple-tooltip.tsx`                                                  | Preserve the child's accessible name and focus behavior                        |

Compose shared primitives. When the owning primitive itself needs a correction,
make the shared effect explicit and check its affected callers. Avoid parallel
wrappers or repeated call-site workarounds that conceal a broken shared pattern.

## Color and data meaning

Web colors live in `apps/web/app/globals.css`. Select a token by meaning and reuse
the established helper. A new chart or table must not invent a competing palette.

| Meaning                                | Source                                                |
| -------------------------------------- | ----------------------------------------------------- |
| Page, card, input, text, border, focus | Semantic theme tokens                                 |
| Ordinary quantitative series           | `--chart-*`; primary series commonly uses `--chart-1` |
| Mods and mod combinations              | `getModColor` in `lib/utils/mods.ts`                  |
| Grades                                 | `--grade-*`                                           |
| Player tiers                           | `--text-<tier>` and existing tier helpers/icons       |
| Tournament rank ranges                 | `RANK_RANGE_BUCKETS` in `lib/beatmaps/rankRange.ts`   |
| Teams                                  | `--team-*`                                            |
| Verification and status                | Existing status palette and badge components          |
| Star difficulty                        | `lib/beatmaps/star-rating-color.ts`                   |

Pass complete CSS color values directly, such as `var(--chart-1)`. Do not wrap
a variable containing an `oklch(...)` color in `hsl(...)`. Preserve domain helpers
that intentionally calculate colors rather than replacing them with unrelated
theme accents.

A reference page can contain historical implementation debt. The player rating
chart includes hardcoded colors; that does not authorize new scattered literals.
Reuse the intended visual treatment through a shared token or domain helper.
Keep distinct domain colors distinct: consistency does not mean making every
series blue. Pair color with a label, shape, or other appropriate cue.

Use the repository's foreground-token rules for readable status text. Verify
changed colors in both themes. Select one named table reference for header,
selection, and hover treatments instead of borrowing each from a different page.

## Charts, copy, and states

Use the established chart wrappers and formatting utilities. Keep axes legible,
series dimensions stable, tooltips aligned, and chart controls reachable with
keyboard and touch. Follow the reference's restrained animation and grid treatment.
Reuse formatters from `lib/utils/chart.ts`, `date.ts`, `format.ts`, and `number.ts`
as applicable; extract reusable formatting semantics rather than duplicating them.

Specify the data source, unit, sample size, and meaning of each statistic before
designing its display. Do not invent unavailable information or infer a new domain
meaning from a convenient field. Distinguish zero, missing data, insufficient data,
and statistics still being generated. Verified data with pending statistics must
not be called unverified.

Cover the loading, empty, error, permission, sparse, and dense states the feature
can actually produce. Long names and narrow widths are design inputs. Do not add
decorative empty states or repeated explanations that make a compact page harder
to scan.

## Design direction

The task owner records one direction. When a specialist is useful in explicitly
requested lead mode, give the writer that direction with:

- The user's job, affected surfaces, and observable acceptance criteria.
- The specific reference patterns and any justified departures.
- Data sources and meanings, including missing or unavailable fields.
- Desktop and narrow-width hierarchy, controls, interactions, and visible copy.
- Relevant states, fixtures, and local checks that establish completion.

Explain consequential choices briefly and record scope, product, and approved
design decisions in the task record. Ask the user about unresolved product meaning.

The owner can build and inspect a prototype directly. Use the user's existing
authorization; when substantial visual direction remains unresolved, provide a
concrete preview or local artifact for the decision. Record approved direction
and unfinished behavior separately. A specialist handoff is optional.

## Evidence and maintenance

All agent browser review uses the task's local site and disposable database. Record
the source commit, route, viewport, theme, fixture, and relevant screenshots.
Inspect rendered output; source code and a screenshot file's existence are not
visual verification. Use desktop and narrow widths, plus both themes when color
or surface treatment changes. Keep test identities and browser state isolated.

Update this reference only when an inspected implementation or explicit design
decision establishes a better pattern. Record the scope and source commit; do not
turn an agent inference into an approved rule. Keep reference additions focused on
patterns another task will use. Full-site audits are not required for every change.

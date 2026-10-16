# Dates, numbers and names

How the site writes dates, numbers, rating changes, rulesets, field names and audited values.
Every formatter uses fixed en-US and UTC and is built so the server and the browser print the same string (issue #1017). Components live in their own files under `@/components/kit/format/`; the pure helpers, with unit tests, under `@/lib/kit/format/`.

- [Rules at a glance](#rules-at-a-glance): the one way to write each kind of value
- [DateText](#datetext): a calendar day, `Jul 20, 2024`
- [DateRangeText](#daterangetext): a span of days, `Jul 20 – Aug 3, 2024`
- [Timestamp](#timestamp): a moment, `Jul 20, 2024, 15:42 UTC`
- [TimeRangeText](#timerangetext): two moments in a day, `15:42 – 15:45 UTC`
- [RelativeTime](#relativetime): `3h ago`, for activity feeds only
- [Figures in dates](#figures-in-dates): proportional, never tabular
- [Date helpers](#date-helpers): `formatDate`, `formatDateRange`, `formatTimestamp`, `formatTimeRange`, `formatRelativeTime`, `toDate`, and lengths with `formatDuration` and `parseDuration`
- [Number helpers](#number-helpers): counts, ranks, ratings, percentiles, percents, years and IDs
- [RatingDelta](#ratingdelta): a rating change, `↑ +12.3`
- [Tier names](#tier-names): `Gold II`, `formatTierName`
- [RulesetName and ruleset names](#rulesetname-and-ruleset-names): `osu!`, `taiko`, `catch`, `mania 4K`, `mania 7K`
- [Field names](#field-names): the glossary, `FIELD_NAMES`
- [Mods](#mods): `HD, HR`
- [Countries](#countries): `CountryFlag`, `CountryName`, `CountryCombobox` and the country helpers
- [Enum labels](#enum-labels): sentence-case names for stored enums
- [Audit values and AuditFieldChange](#audit-values-and-auditfieldchange): labels and values for audit diffs

## Rules at a glance

| Value                 | Write it as                                               | Helper or component                         |
| --------------------- | --------------------------------------------------------- | ------------------------------------------- |
| Day                   | `Jul 20, 2024`                                            | `DateText`, `formatDate`                    |
| Range of days         | `Jul 20 – Aug 3, 2024`, `Jul 20 – 27, 2024`               | `DateRangeText`, `formatDateRange`          |
| Moment                | `Jul 20, 2024, 15:42 UTC` (24-hour)                       | `Timestamp`, `formatTimestamp`              |
| Two moments in a day  | `15:42 – 15:45 UTC`                                       | `TimeRangeText`, `formatTimeRange`          |
| Time since, in a feed | `3h ago`, full timestamp on hover, focus and tap          | `RelativeTime`                              |
| Length                | `2:04`, `1:02:04`                                         | `formatDuration`                            |
| Count                 | `12,345`                                                  | `formatCount`, `formatCountOf`              |
| Rank                  | `#1,234`, everywhere                                      | `formatRank`                                |
| Rating                | `1,835`; `1,834.57` in tooltips and exports               | `formatRating`, `formatRatingPrecise`       |
| Rating change         | `+12.3`, `−4.5`, `0.0`: one decimal, coloured, with arrow | `RatingDelta`, `formatRatingDelta`          |
| Tier                  | `Gold II`, `Elite Grandmaster`; `Gold` in a tier legend   | `formatTierName`                            |
| Percentile            | `97th percentile` (`97th` under a "Percentile" label)     | `formatPercentile`                          |
| Share                 | `54.2%`                                                   | `formatPercent`                             |
| Accuracy              | `98.54%`                                                  | `formatAccuracy`                            |
| Year, ID              | `2024`, `4012345`: never separated                        | `formatYear`, `formatId`                    |
| Rank restriction      | `Open rank`, `10,000+`                                    | `formatRankRange`                           |
| Lobby size            | `1v1`, `4v4`                                              | `formatLobbySize`                           |
| Ruleset               | `osu!`, `taiko`, `catch`, `mania 4K`, `mania 7K`          | `RulesetName`, `getRulesetLabel`            |
| Mods                  | `HD, HR`, `NM`                                            | `formatMods`                                |
| Country               | Flag, with `South Korea` on tap; English, from the server | `CountryFlag`, `CountryName`                |
| Missing value         | `—` (em dash), muted                                      | `EMPTY_VALUE` from `@/lib/kit/format/empty` |

Never call `toLocaleString()`, `toLocaleDateString()`, `Intl.*` without a fixed locale and `timeZone: 'UTC'`, or date-fns `format()` in UI code. They follow the visitor's locale or time zone and break hydration.

## DateText

A calendar day in UTC. Use it wherever the day matters and the time does not, such as the day on a match card or the "Played" column of a beatmap leaderboard.

```tsx
import { DateText } from '@/components/kit/format/DateText';

<DateText date={tournament.startTime} />;
// <time dateTime="2024-07-20">Jul 20, 2024</time>
```

- `date`: a `Date`, epoch milliseconds or a string, including Postgres text such as `2024-07-20 15:42:00.123456+00`. A date and time with no zone (`2024-07-20T15:42:00`) is read as UTC. `null` and unreadable values render `empty`.
- `empty`: the muted text for a missing date. Defaults to an em dash.
- Renders a `<time>` with an ISO `dateTime`, and does not wrap.

Do:

- Use it in metadata lines, tiles and table cells.

Don't:

- Don't render `formatUTCDate` (`2024-07-20`) to people. It stays for URL parameters and form values only. Legacy displays: `components/player/PlayerTournamentCard.tsx`, `components/matches/MatchCard.tsx`, `components/beatmap/BeatmapLeaderboardCard.tsx`, the date chips in `components/tournaments/list/TournamentListFilter.tsx`.
- Don't use `components/dates/FormattedDate.tsx`: it formats in en-GB and the visitor's own time zone, and renders nothing on the server.

Gallery anchor: `/admin/design#format-date`

## DateRangeText

A span of days, sharing the month and year where both ends do. Use it for tournament dates and any other range of days.

```tsx
import { DateRangeText } from '@/components/kit/format/DateRangeText';

<DateRangeText start={tournament.startTime} end={tournament.endTime} />;
```

| Case          | Output                       |
| ------------- | ---------------------------- |
| One day       | `Jul 20, 2024`               |
| Same month    | `Jul 20 – 27, 2024`          |
| Same year     | `Jul 20 – Aug 3, 2024`       |
| Across years  | `Dec 28, 2023 – Jan 4, 2024` |
| No end date   | `From Jul 20, 2024`          |
| No start date | `Until Aug 3, 2024`          |
| No dates      | `—` (muted, or `empty`)      |

- `start`, `end`: as `DateText`'s `date`.
- `empty`: the muted text when both ends are missing.
- The separator is a spaced en dash with plain spaces. `Intl.DateTimeFormat#formatRange` puts thin spaces around it on V8 and plain ones on JavaScriptCore, so do not use it.

Don't:

- Don't write `2024-07-20 - 2024-08-03` or `2024-07-20 – 2024-08-03`. Legacy: the tournament page header (`app/tournaments/[id]/page.tsx`), `components/player/PlayerTournamentCard.tsx`, `components/beatmap/BeatmapPoolsDialog.tsx`.
- Don't add weekdays (`Sat, Jul 20 – Sun, Jul 21, 2024`). Legacy: `formatUTCDateRange` and `formatUTCDayRange` in `lib/utils/date.ts`.
- `formatTournamentDates` in `components/tournaments/TournamentListRow.tsx` is the closest legacy version; replace it with this.

Gallery anchor: `/admin/design#format-date-range`

## Timestamp

A moment in UTC on a 24-hour clock, with the zone written out. Use it for match and game times, report and audit times, and anywhere the time of day matters.

```tsx
import { Timestamp } from '@/components/kit/format/Timestamp';

<Timestamp date={match.startTime} />            // Jul 20, 2024, 15:42 UTC
<Timestamp date={entry.created} seconds />      // Jul 20, 2024, 15:42:07 UTC
```

- `seconds`: add seconds only where two events can share a minute (audit entries, game start and end).
- `empty`: the muted text for a missing time.

Don't:

- Don't show local time, 12-hour clocks or offsets such as `UTC+02:00`. Legacy: `components/dates/FormattedDate.tsx`, `formatExactTime` in `components/audit/formatRelativeTime.ts`, `formatUTCDateFull` (`2023-10-05 14:30:45 UTC`) in `lib/utils/date.ts`.

Gallery anchor: `/admin/design#format-timestamp`

## TimeRangeText

Two moments in UTC on a 24-hour clock, such as when a game started and ended. The day is left out when both ends share it, so use it where the day is already on the page, such as a match's game cards.

```tsx
import { TimeRangeText } from '@/components/kit/format/TimeRangeText';

<TimeRangeText start={game.startTime} end={game.endTime} seconds />;
// 15:42:07 – 15:45:30 UTC
```

| Case                  | Output                                              |
| --------------------- | --------------------------------------------------- |
| Same UTC day          | `15:42 – 15:45 UTC`                                 |
| Same day, `showDate`  | `Jul 20, 2024, 15:42 – 15:45 UTC`                   |
| Across midnight (UTC) | `Jul 20, 2024, 23:58 UTC – Jul 21, 2024, 00:02 UTC` |
| No end time           | `From Jul 20, 2024, 15:42 UTC`                      |
| No start time         | `Until Jul 20, 2024, 15:45 UTC`                     |
| No times              | `—` (muted, or `empty`)                             |

- `start`, `end`: as `Timestamp`'s `date`.
- `seconds`: add seconds where two events can share a minute (game times).
- `showDate`: write the day before the times when both ends share it.
- `empty`: the muted text when both ends are missing.
- A range within a day does not wrap. Across midnight each end stays whole and the second may wrap after the dash, so two full timestamps fit a phone.
- Extra props, such as `data-testid`, go on the root span. `formatTimeRange` in `@/lib/kit/format/date` gives the same text for `aria-label`s and tooltips; the component file still re-exports it.

Don't:

- Don't write two `Timestamp`s with a hand-made dash between them: the day repeats and the dash differs from every other range.

Gallery anchor: `/admin/design#format-time-range`

## RelativeTime

Time since an event, `3h ago`, with the full UTC timestamp in a tooltip that opens on hover, focus and tap. Only for activity feeds, such as the audit log and report lists. Everywhere else use `Timestamp` or `DateText`.

```tsx
import { RelativeTime } from '@/components/kit/format/RelativeTime';

<RelativeTime date={entry.created} className="text-xs text-muted-foreground" />;
```

- `date`: the event time.
- `now`: a fixed reference time. It also stops the clock; use it in demos and tests only. Without it the text catches up every 30 seconds.
- `side`: where the tooltip opens. Defaults to `top`.
- `empty`: the muted text for a missing time. Defaults to an em dash.
- Steps: `just now` under a minute, then `5m ago`, `3h ago`, `12d ago`, then the plain date from 30 days on. Future times read `in 5m`.
- Client component. The trigger is a button (from `TapTooltip`), so it is keyboard reachable.
- `className` and extra props, such as `data-testid`, go on the outer span, which holds the button and the `<time>` inside it, so `[data-testid="…"] time` finds the time.

Don't:

- Don't use relative time in tables, headers or detail pages. People compare and copy those values.
- Legacy: `components/audit/RelativeTime.tsx` and `formatRelativeTime` in `components/audit/formatRelativeTime.ts` (locale-dependent tooltip, hover only).

Gallery anchor: `/admin/design#format-relative-time`

## Figures in dates

Every date component (`DateText`, `DateRangeText`, `Timestamp`, `TimeRangeText`, `RelativeTime`) keeps the body's proportional figures. Don't add `tabular-nums` to one or to the element around it (figures are inherited), also not in a table column: a date cell is a plain `DataTableCell`, never `numeric`.

Why: a date mixes words and digits, so tabular figures never line dates up (`Jul` and `Aug` already differ in width), and Inter's tabular forms open gaps in them. Measured at one size, the tabular `1` is 78% wider than the proportional one, and the comma and colon a fifth wider: `Jul 11, 2024, 11:11 UTC` grows by 23% and reads `Jul 1 1`. A test in `components/kit/format/__tests__/format.test.tsx` keeps every date component free of figure classes.

Don't:

- Don't pass `className="tabular-nums"` to a date component or its wrapper. Legacy: the Submitted and Reviewed rows in `components/reports/ReportDetails.tsx`; the date range in `components/tournaments/TournamentHero.tsx` (its `HeroMetaItem`) and `components/tournaments/TournamentListRow.tsx`; both start times in `components/tournaments/MatchLedgerRow.tsx`; the date cells in `app/admin/reports/AdminReportsClient.tsx`, `app/reports/MyReportsClient.tsx`, `app/admin/AdminDashboardClient.tsx` and `app/settings/ApiKeySettingsClient.tsx`.

## Date helpers

Plain functions in `@/lib/kit/format/date` for strings outside JSX: chart axes, tooltips, `aria-label`s, CSV.

```ts
import {
  formatDate,
  formatDateRange,
  formatRelativeTime,
  formatTimeRange,
  formatTimestamp,
  formatDuration,
  parseDuration,
  toDate,
  toDateTimeAttribute,
} from '@/lib/kit/format/date';

formatDate('2024-07-20T23:30:00-05:00'); // "Jul 21, 2024" (the UTC day)
formatDateRange(start, end, { empty: 'Unknown' });
formatTimestamp(created, { seconds: true });
formatTimeRange(game.startTime, game.endTime, { seconds: true }); // "15:42:07 – 15:45:30 UTC"
formatRelativeTime(created, Date.now());
toDate('2024-07-20 15:42:00+00'); // Date, or null when unreadable
formatDuration(124); // "2:04"; formatDuration(3724) is "1:02:04"
parseDuration('1:02:04'); // 3724, or null when it isn't a length
```

- All of them take `Date | string | number | null | undefined` and print `empty` (an em dash by default) for missing or unreadable input.
- Strings with no zone (`2024-07-20T15:42:00`) are read as UTC. `new Date()` would read them in the visitor's zone, so always go through `toDate`.
- Month names are written by hand, not by `Intl`, so output is identical on every engine.
- `formatRelativeTime` depends on the clock, so the server and the browser disagree. Never print it straight into server-rendered markup; use `RelativeTime`, which handles hydration.
- `formatDuration(seconds)` writes a length, such as a beatmap's: `m:ss` under an hour, `h:mm:ss` from an hour, fractions of a second dropped, and `empty` for missing or negative input. It is a number that sits in columns, so give it `tabular-nums` outside the kit's numeric cells. `parseDuration` reads the same text (or bare seconds) back, for a length typed into a form, and returns null for anything else.
- Don't import `formatDuration` or `parseDuration` from `lib/utils/date.ts`; they moved here.

## Number helpers

Plain functions in `@/lib/kit/format/number`. Each returns a string. All but `formatCountOf`, `formatOrdinal` and `formatRatingDelta` (which take a plain number) print `empty` (an em dash) for `null`, `undefined`, `NaN` and infinities.

```ts
import {
  formatAccuracy,
  formatCount,
  formatCountOf,
  formatId,
  formatNumber,
  formatOrdinal,
  formatPercent,
  formatPercentile,
  formatRank,
  formatRating,
  formatRatingPrecise,
  formatYear,
} from '@/lib/kit/format/number';

formatCount(12345); // "12,345"
formatCountOf(1204, 'match', 'matches'); // "1,204 matches"
formatRank(1234); // "#1,234"
formatRating(1834.567); // "1,835"
formatRatingPrecise(1834.567); // "1,834.57"
formatPercentile(97.53); // "97th percentile"
formatPercentile(97.53, { short: true }); // "97th"
formatPercent(0.5423); // "54.2%"  (takes a fraction)
formatAccuracy(0.98543); // "98.54%" (takes a fraction)
formatNumber(174.5, { maxDecimals: 2 }); // "174.5"
formatYear(2024); // "2024"
formatId(4012345); // "4012345"
```

- Counts, ranks, ratings and every other quantity get thousands separators. Years and IDs are labels and never do; this includes osu! IDs, beatmap IDs and chart axes of years.
- Figures: the body sets Inter's default proportional figures, because its tabular figures also widen the hyphen (`Pre - verified`). Numbers that sit in columns or change in place take `tabular-nums`. The kit already sets it on numeric table cells, phone-row ranks and values, stat tile values, section header meta, list toolbar counts, hero tab counts, badge counts, pagination and load-more readouts, rating changes, and chart ticks, tooltip values and tooltip footers; add it yourself only to a number outside those. Never put it on prose, labels or dates (see [Figures in dates](#figures-in-dates)).
- Ratings show as whole numbers. Use `formatRatingPrecise` only where the decimals are the point (a tooltip, an export).
- Nothing prints `-0`: values are rounded half away from zero first.

The percentile style, and why: a whole ordinal, `97th percentile`, rounded down and kept within 1st–99th. Pass the stored `percentile` as it is: the processor writes it on a 0–100 scale (the share of players ranked below).

- The beatmap pages, the reference, already use the ordinal (`93rd percentile spread`).
- It reads at a glance. The exact position is already on screen as the rank (`#1,234`), so two decimals (`97.53%`) add noise without information.
- Rounding down never overstates a player; clamping avoids `0th` and `100th`, which read as errors.
- `97.53%` looks like a share of something (accuracy, win rate). The ordinal cannot be mistaken for one.

Don't:

- Don't write `#1234` (legacy: `app/leaderboard/columns.tsx`) or `#${rank.toLocaleString()}` (legacy: `components/player/PlayerRatingStatsCard.tsx`); use `formatRank`.
- Don't render counts bare. Legacy: tournament and match counts on the leaderboard and the profile, and the year, ruleset and lobby-size chart axes.
- Don't use `formatPercentage` (`lib/utils/chart.ts`) for percentiles, `formatChartNumber` (locale-dependent `toLocaleString()`), the local `ordinal` in `components/beatmap/BeatmapMarginCard.tsx`, or `formatAccuracy` from `lib/utils/format.ts` in new code.

Gallery anchor: `/admin/design#format-numbers`

## RatingDelta

A rating change: coloured text with an arrow and one decimal, never a pill. It inherits the font size, so the same component fits a table cell, a stat tile and a chart tooltip.

```tsx
import { RatingDelta } from '@/components/kit/format/RatingDelta';

<RatingDelta value={adjustment.ratingDelta} />         // ↑ +12.3
<RatingDelta value={-6.2} lowerIsBetter />             // ↓ −6.2, in green
```

- `value`: the raw change. It is rounded to one decimal; anything that rounds to `0.0` is flat (`→ 0.0`, muted).
- `lowerIsBetter`: colour a fall as good, for volatility. The arrow and sign still follow the number.
- The sign (`+`, a true minus `−`, none for zero) and the arrow carry the direction; colour only reinforces it. The arrow is `aria-hidden`.
- Colours are tokens: `text-success-foreground` up, `text-destructive-foreground` down, `text-muted-foreground` flat. `formatRatingDelta(value)` and `getDeltaDirection(value)` in `@/lib/kit/format/number` give the text and direction for non-React uses such as chart labels.
- Line height: the number gives the box its baseline and the arrow is centred beside it, so in running text or a `dd` it sits on the line's baseline and keeps the line's height (a 20px line stays 20px). Don't add `align-middle` or a flex wrapper to level it.

Contrast of the text (WCAG 2, 4.5:1 needed):

| Theme | Direction | Token value | Card   | Panel | Tile  | Popover | Tooltip |
| ----- | --------- | ----------- | ------ | ----- | ----- | ------- | ------- |
| Light | Up        | green-800   | 6.6:1  | 6.6:1 | 6.5:1 | 6.3:1   | 5.5:1   |
| Light | Down      | red-800     | 7.8:1  | 7.8:1 | 7.7:1 | 7.4:1   | 6.5:1   |
| Light | Flat      | muted       | 4.9:1  | 4.9:1 | 4.8:1 | 4.7:1   | 4.7:1   |
| Dark  | Up        | green-400   | 10.1:1 | 9.7:1 | 9.5:1 | 9.4:1   | 6.4:1   |
| Dark  | Down      | red-400     | 6.2:1  | 5.9:1 | 5.8:1 | 5.8:1   | 3.9:1   |
| Dark  | Flat      | muted       | 6.5:1  | 6.2:1 | 6.1:1 | 6.0:1   | 5.1:1   |

Card is `bg-card`, panel the Panel surface, tile a Tile on a panel, popover `bg-popover`, and tooltip the `bg-accent` surface of the shadcn tooltip and TapTooltip, where flat takes the tooltip's own muted text (`--accent-muted-foreground`). Every pair clears 4.5:1 except a fall in a dark tooltip.

Do:

- Put it after the number it changes: `1,835 ↑ +18.7`.

Don't:

- Don't wrap it in a tinted pill or badge. Legacy: `components/rating/RatingDelta.tsx` (pill, `text-green-500` on a 10% tint, about 2.2:1 in light mode), used by the profile match table, profile tournament cards and match stats.
- Don't show two decimals. Legacy: `components/player/PlayerRatingChartTable.tsx` and `PlayerRatingChartTooltip.tsx`.
- Don't put it in a shadcn tooltip or a TapTooltip (`bg-accent`): in dark mode a fall's red-400 is 3.9:1 there. Show the change on the page, or in a chart tooltip card (`ChartTooltipContent`, on `bg-background`) or a popover.

Gallery anchor: `/admin/design#format-rating-delta`

## Tier names

A tier and its subtier, as the tier icon's tooltip, the leaderboard, the profile and the stats chart write it: the subtier as a roman numeral, I at the top of a tier and III at the bottom.

```ts
import { formatTierName, type TierName } from '@/lib/kit/format/tier';

formatTierName('Gold', 2); // "Gold II"
formatTierName('Bronze', 3); // "Bronze III"
formatTierName('Platinum'); // "Platinum": no subtier, as in a tier legend
formatTierName('Elite Grandmaster', 1); // "Elite Grandmaster": it has no subtiers
```

- `subTier` is 1, 2 or 3; anything else, `null` or `undefined` gives the tier alone.
- Colour the name with `TIER_TEXT_CLASS[tier]` from `@/lib/kit/color/tiers` ([color.md](color.md#tier-colours)).
- `TierName` is re-exported here, so a page imports the type and the name from one place. Working out a tier from a rating (`getTierFromRating`) still lives in `lib/utils/tierData.ts`.

Don't:

- Don't use `getTierString` from `lib/utils/tierData.ts` or build `${tier} ${numeral}` by hand; use `formatTierName`.

Gallery anchor: `/admin/design#format-tier-name`

## RulesetName and ruleset names

One label set: `osu!`, `taiko`, `catch`, `mania 4K`, `mania 7K`, with the full name (`osu!taiko`) for tooltips and the accessible name of an icon on its own.

```tsx
import { RulesetName } from '@/components/kit/format/RulesetName';
import {
  RATED_RULESETS,
  RULESET_NAMES,
  getRulesetFullName,
  getRulesetLabel,
} from '@/lib/kit/format/ruleset';

<RulesetName ruleset={tournament.ruleset} />           // icon + "taiko"
<RulesetName ruleset={player.ruleset} iconOnly />      // icon, tooltip "osu!taiko"
<RulesetName ruleset={Ruleset.Mania4k} showIcon={false} />
```

- `RulesetName` is a label, not a control. `iconOnly` adds a tooltip that opens on hover, focus and tap, with the full name as its `aria-label`. The icon is muted.
- `RATED_RULESETS` is the order for chips, tabs, legends and ruleset filters. It leaves out `Ruleset.ManiaOther` (`mania (other)`), as the tournament list, beatmap list, leaderboard and filter tool do. Only admin pickers offer it: the tournament, game and beatmap edit dialogs, and the submission form when an admin is signed in.
- `RULESET_NAMES[ruleset]` is `{ label, fullName }` (type `RulesetNameEntry`) for every `Ruleset`.
- `getRulesetLabel(n)` and `getRulesetFullName(n)` take any number and return `Unknown ruleset` outside the enum. Always go through `Ruleset` from `@otr/core/osu`; never hard-code `0`–`5`.
- `RulesetIcon` (`components/icons/RulesetIcon.tsx`) stays: `RulesetName` uses it.

Don't:

- Don't use `RulesetEnumHelper` text (`osu!taiko`, `osu!mania 4K`, `osu!mania (other)`) as a visible label. Legacy users: `components/select/RulesetSelectContent.tsx`, `components/buttons/RulesetButton.tsx` and `RulesetSelector.tsx`, `components/leaderboard/LeaderboardFilter.tsx`, `components/beatmaps/list/BeatmapListFilter.tsx`, `components/stats/RatingDistributionTabs.tsx` and `TournamentsByRulesetChart.tsx`, `components/filtering/FilterReportView.tsx`, `components/matches/MergeMatchButton.tsx`, `components/search/results/PlayerResultContent.tsx` and `TournamentResultContent.tsx`, `cohortName` in `components/beatmap/BeatmapMarginCard.tsx`.
- Don't strip the prefix by hand (`.replace('osu!', '')`, legacy in `components/tournaments/TournamentListRow.tsx`).
- `getBeatmapRulesetLabel` (`lib/beatmaps/presentation.ts`) and `RulesetPill` (`components/beatmaps/RulesetPill.tsx`) still print the long names; keep `getBeatmapDisplayRuleset` for reading 4K and 7K from a difficulty name, then label the result with `getRulesetLabel`.

Gallery anchor: `/admin/design#format-ruleset`

## Field names

The glossary: one user-facing name per field, in sentence case, for labels, column headers, filters, tooltips and audit diffs alike.

```ts
import {
  FIELD_NAMES,
  fieldLabel,
  formatLobbySize,
  formatRankRange,
} from '@/lib/kit/format/fields';

fieldLabel('lobbySize'); // "Lobby size"
fieldLabel('rankRange'); // "Rank restriction"
fieldLabel('starRating', { short: true }); // "SR"
formatRankRange(1); // "Open rank"
formatRankRange(10000); // "10,000+"
formatLobbySize(4); // "4v4"
```

- Each entry has `label`, an optional `short` for narrow headers and tiles, and `legacy`: the names it replaces. Never render a `legacy` name; search for it to find what to migrate.
- Keys and helpers keep the stored column's name (`rankRange` and `formatRankRange` for `rankRangeLowerBound`); only the label changes.
- The values these write follow the forms' rules: a rank restriction is a whole number from 1 (`Open rank`), and a lobby size runs from `1v1` to `8v8`.
- Filters use the site's short labels: "Matches", "Tiers" (the filter picks several) and "Status" (the `short` of `verificationStatus`).
- `humanizeFieldName('drainLength')` gives `Drain length` for a raw name with no entry. Prefer adding the entry.

The duplicates it settles:

| Use               | Not                              | Seen in                                                                                                                                                                  |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lobby size        | Team size, Team Size, Lobby Size | `tournaments/list/TournamentListFilter.tsx`, `beatmap/BeatmapPoolsDialog.tsx`, `stats/TournamentsByLobbySizeChart.tsx`, audit                                            |
| Rank restriction  | Rank range, Rank Range           | `beatmap/BeatmapPoolsDialog.tsx`, audit                                                                                                                                  |
| Open rank (value) | Open                             | `player/PlayerTournamentCard.tsx`, the tournament page (`apps/web/app/tournaments/[id]/page.tsx`), `formatRankRangeBound` in `lib/beatmaps/rankRange.ts`                 |
| Forum post URL    | Forum URL                        | `tournaments/TournamentAdminView.tsx`, audit (the validation messages already say Forum post URL, from `lib/orpc/schema/tournamentMessages.ts`)                          |
| Ruleset           | Game mode, Mode                  | form tooltips in `tournaments/TournamentSubmissionForm.tsx`, `filtering/FilteringForm.tsx`                                                                               |
| Peak rating       | Highest rating                   | `player/PlayerRatingChart.tsx`                                                                                                                                           |
| Match cost        | Match Cost                       | `tournaments/TournamentTopPerformers.tsx`; the match page highlight `Top Match Cost` (`matches/MatchStatsUtils.ts`) names the best value, so it becomes `Top match cost` |
| Win rate          | Win rate %                       | `leaderboard/LeaderboardFilter.tsx`                                                                                                                                      |
| osu! rank         | osu! Global Rank                 | `leaderboard/LeaderboardFilter.tsx` (the osu! rank, not the o!TR rank)                                                                                                   |
| Global rank       | Global, Global Rank              | `player/PlayerRatingStatsCard.tsx`; `short` is `Rank`                                                                                                                    |
| Mappers           | Creators                         | audit                                                                                                                                                                    |
| Length            | Total length                     | audit                                                                                                                                                                    |

Paths are under `apps/web/components/`. Other values: `formatRankRange` in `lib/utils/number.ts` and `formatRankRangeBound` call `toLocaleString()` without a locale; `LobbySizeEnumHelper` prints `Unknown` where the kit prints an em dash.

Gallery anchor: `/admin/design#format-field-names`

## Mods

Mod bitflags as acronyms, in bit order: `HD, HR`.

```ts
import { formatMods, getModAcronyms } from '@/lib/kit/format/mods';

formatMods(24); // "HD, HR"
formatMods(0); // "NM"
formatMods(Mods.DoubleTime | Mods.Nightcore); // "NC"
formatMods(Mods.FreeModAllowed); // "Freemod"
```

- This is the faithful form: it keeps NF, SO, V2 and key mods, and drops only a flag another implies (DT under NC, SD under PF). Use it for data views and audit values.
- Acronyms follow the site's `ModsEnumHelper` (Cinema is `CM`). Key co-op, which it leaves blank, is `CO`, as the data worker reads it.
- The beatmap pages' display rules (drop NF and SO, fold NC into DT, `HDHR` without separators) stay in `lib/utils/mods.ts` (`getBeatmapModLabel`) with the mod colours.

## Countries

A player's country as osu!'s flag and its English name. Components live in `@/components/kit/country/`, the helpers in `@/lib/kit/format/country`.

Names come from `Intl.DisplayNames` with a fixed `en` locale, so they never follow the visitor's language. Work them out on the server: browsers carry their own region data, and some name a few regions differently (older ones still write `Turkey` for `Türkiye`), which would break hydration. The components do this for you when a server component renders them; a client component passes `name` (or the options) down from one.

### CountryFlag

```tsx
import { CountryFlag } from '@/components/kit/country/CountryFlag';

<CountryFlag code={player.country} />            // flag; "Australia" on tap, hover and focus
<CountryFlag code={player.country} decorative /> // inside a link that names the country
<CountryFlag code={score.player.country} name={countryNames[score.player.country]} /> // in a client component
```

- `code`: the code osu! stores (`AU`). Empty renders nothing; a code osu! has no flag for shows its "unknown" flag.
- `tooltip`: on by default. The flag becomes a button named by the country, whose tooltip opens on tap, hover and keyboard focus. Its tap area reaches 4px past the flag, so keep 8px between two flags.
- `tooltip={false}`: no button; the image's alt text is the name.
- `decorative`: hidden from assistive tech with no tooltip, for a flag inside a link whose accessible name says the country, or beside the written name.
- `size`: `sm` (16×11) beside 12–14px text, `md` (21×14, default) in rows and heroes. Both sides are set in CSS too, so next/image never warns that one was resized alone.
- `name`: the English name from the server. Leave it out in server components.
- `className`: on the button when the flag names itself, otherwise on the image.

### CountryName

A flag and the name, for a profile's country or the chosen value in a filter. The flag is decorative.

```tsx
import { CountryName } from '@/components/kit/country/CountryFlag';

<Link href={countryLeaderboardHref} className="…">
  <CountryName code={player.country} />
</Link>;
```

- `truncate`: cut a long name with an ellipsis instead of wrapping it.
- Extra props go on the root span.

### CountryCombobox

A searchable country picker for filters, such as the leaderboard's country filter. It searches names (case, accents, apostrophes and punctuation ignored, so `cote d'ivoire` finds `Côte d’Ivoire`), their spelled-out forms (`saint lucia` and `trinidad and tobago` find `St. Lucia` and `Trinidad & Tobago`), a few older or common names `Intl` does not use (`turkey`, `ivory coast`, `usa`, `uk`), and exact codes (`kr`). It lists the chosen country first with a check, then an exact code or name, then names starting with the term, then the rest, and clears the choice when it is chosen again.

```tsx
// Server component:
import { getCountryOptions } from '@/lib/kit/format/country';
<LeaderboardToolbar countries={getCountryOptions()} … />

// Client component:
import { CountryCombobox } from '@/components/kit/country/CountryCombobox';

<FilterField label="Country">
  <CountryCombobox
    value={state.country}
    onValueChange={(country) => setState({ country })}
    countries={countries}
    data-testid="leaderboard-filter-country-button"
  />
</FilterField>;
```

- `value`: the chosen code, or `''`. `onValueChange` gets the code, or `''` when cleared.
- `countries`: from `getCountryOptions()` on the server, sorted by name.
- `placeholder` (`Any country`), `searchPlaceholder` (`Search countries`), `emptyText` (`No country found.`).
- Extra props, such as `data-testid` and `aria-label`, go on the trigger button. A chosen code the list does not offer (an old address) is still named on the button.

### Country helpers

```ts
import {
  COUNTRY_CODES,
  filterCountryOptions,
  getCountryFlagUrl,
  getCountryName,
  getCountryNames,
  getCountryOptions,
} from '@/lib/kit/format/country';

getCountryName('KR'); // "South Korea"
getCountryName('XX'); // "Unknown"
getCountryNames(players.map((player) => player.country)); // { KR: "South Korea", … }
getCountryOptions(); // [{ code: 'AF', name: 'Afghanistan' }, …]
```

- `COUNTRY_CODES`: the ISO 3166-1 alpha-2 codes and `XK` (Kosovo), 250 in all.
- `getCountryName`: also names osu!'s older codes that are not countries: `XX` (`Unknown`) and the legacy GeoIP regions (`EU` is `Europe` there, not the European Union). An unknown code comes back as itself.
- `getCountryNames(codes)`: a map for a server component to hand to a client one, such as a match's score cards.
- `getCountryFlagUrl(code)`: osu!'s flag image. Codes osu!'s flag set lacks (`BQ`, `CW`, `SX`, and anything unknown) get its "unknown" flag instead of a broken image.
- `filterCountryOptions(options, term, selected)`: the search the combobox runs, ranked as above. Its search-only aliases (`SEARCH_ALIASES` in the same file) are never shown; add one when people search for a name `Intl` does not contain.

Do:

- Show the country as a flag in rows and as `CountryName` where there is room, such as a profile hero.

Don't:

- Don't use `components/shared/CountryFlag.tsx`: its tooltip opens on hover only, its alt text is the code (`AU flag`), and next/image warns that its height was changed alone.
- Don't use the `countries-and-timezones` library (`components/leaderboard/countries.ts`) for names. It loads a country and time zone library in the browser only for names `Intl` already has (issue #1020), and it names countries differently from the profile (`United States of America`, `Ivory Coast`).
- Don't build a country `Intl.DisplayNames` in a page (`components/player/PlayerHero.tsx`); use `getCountryName`.

Gallery anchors: `/admin/design#format-country-flag`, `/admin/design#format-country-name`, `/admin/design#format-country-combobox`

## Enum labels

Sentence-case names for the stored enums people read, in `@/lib/kit/format/enum-labels`: tournament, match, game and score rejection reasons; match and game warnings; scoring type; team type (`Team Vs`); team; grade; data fetch status; beatmap ranked status (`Graveyard` … `Loved`); rating adjustment type (`Initial`, `Decay`, `Match`, `Volatility decay`); and the filter tool's failure reasons, each with a sentence.

```ts
import {
  GAME_REJECTION_REASON_LABELS,
  TEAM_TYPE_LABELS,
  formatEnumValue,
  formatFlags,
  getFlagLabels,
} from '@/lib/kit/format/enum-labels';

formatFlags(3, GAME_REJECTION_REASON_LABELS); // "No scores, Invalid mods"
formatFlags(0, GAME_REJECTION_REASON_LABELS); // "None"
getFlagLabels(3, GAME_REJECTION_REASON_LABELS); // ["No scores", "Invalid mods"]
formatEnumValue(9, TEAM_TYPE_LABELS); // "Unknown (9)"
RATING_ADJUSTMENT_TYPE_LABELS[point.adjustmentType]; // "Volatility decay"
```

The filter tool's failure reasons have a name and a sentence each, for a badge and its tooltip. `getSetFlags` gives the set flags in bit order, to look each one up in both tables:

```tsx
import {
  FILTERING_FAIL_REASON_DESCRIPTIONS,
  FILTERING_FAIL_REASON_LABELS,
  getFlagLabels,
  getSetFlags,
} from '@/lib/kit/format/enum-labels';

getFlagLabels(player.failureReason, FILTERING_FAIL_REASON_LABELS); // ["Low rating"], for the CSV
getSetFlags(player.failureReason, FILTERING_FAIL_REASON_LABELS).map((flag) => (
  <TapTooltip key={flag} content={FILTERING_FAIL_REASON_DESCRIPTIONS[flag]}>
    <Badge tone="destructive" size="sm">
      {FILTERING_FAIL_REASON_LABELS[flag]}
    </Badge>
  </TapTooltip>
));
```

- Every table is keyed by its enum, so a new member fails the type check until it has a name.
- `getFlagLabels` gives one line per set flag, for tooltips and lists; unnamed bits read `Unknown (64)`.
- Verification status names come from the status family (`getVerificationStatusName` in `@/lib/kit/status/verification`).
- `getSetFlags(value, labels)`: the named flags set, lowest first; unnamed bits, zero and values that are not flags give none. `getFlagLabels` is built on it and adds `Unknown (64)` for unnamed bits.
- Replaces the Title Case texts in `lib/enum-helpers.ts` (`No End Time`, `Head to Head`, `Tag Co-op`, `Low Rating`, `High Peak`) with their sentence-case forms; osu! terms keep the site's spelling (`Team Vs`). Enum numbers never change: they are a contract with the processor.

Don't:

- Don't keep a local copy of a label table. Legacy: `RATING_ADJUSTMENT_TYPE_LABELS` in `components/player/rating-adjustment.ts`, and `VISIBLE_FAILURE_REASONS` in `components/filtering/FailureReasonsBadges.tsx`. That file also limits the badges to the two reasons the tool's form can set; keep that limit in the page.

## Audit values and AuditFieldChange

Readable labels and values for every audited field, and the diff line that shows one change.

```tsx
import {
  AuditChangeList,
  AuditFieldChange,
} from '@/components/kit/format/AuditFieldChange';

<AuditChangeList>
  {Object.entries(entry.changes).map(([field, change]) => (
    <AuditFieldChange
      key={field}
      entityType={entry.entityType}
      field={field}
      change={change}
      users={entry.referencedUsers}
    />
  ))}
</AuditChangeList>;
```

Renders `Mods  ~~HD, HR~~ → HD`: the label in 12px muted, the old value muted and struck through (`<del>`), an arrow, and the new value (`<ins>`). Missing values show a muted em dash read as "No value". Rows wrap on phones, and the arrow wraps with the new value.

- `entityType`, `field`, `change`: as stored, `{ originalValue, newValue }`.
- `users`: names for the user IDs the entry references, keyed by ID. A missing name reads `Deleted user (12)`.
- `renderValue(value, side)`: replace a value's text, for example to put the status family's icon before a verification status (`value.status` is set for those).
- `className` and extra props, such as `data-testid`, go on the row (the element with `data-audit-field`).
- Values are prose, in the body's proportional figures, so `Pre-verified` keeps Inter's narrow hyphen. Don't add `tabular-nums` (it would read `Pre - verified`) or `proportional-nums` (the body already has it).

The helpers behind it, in `@/lib/kit/format/audit`:

```ts
import {
  AUDIT_FIELDS,
  formatAuditValue,
  getAuditFieldLabel,
  listAuditFields,
} from '@/lib/kit/format/audit';

getAuditFieldLabel(AuditEntityType.Tournament, 'rankRangeLowerBound'); // "Rank restriction"
formatAuditValue(AuditEntityType.Game, 'mods', 24).text; // "HD, HR"
formatAuditValue(
  AuditEntityType.Match,
  'startTime',
  '2024-07-20T15:42:07+00:00'
).text;
// "Jul 20, 2024, 15:42:07 UTC"
listAuditFields(); // [{ entityType, field, label }], for a field filter
```

- `AUDIT_FIELDS` gives each field a glossary label and a format: mods, timestamps (with seconds, so a correction of a few seconds still shows), durations (`3:42`), rulesets, rank restrictions, lobby sizes, verification statuses, enums, bitflags, users, counts with separators, IDs without.
- A test compares it with the schema, so a new audited column fails until it has an entry.
- Unknown fields (such as the retired `processingStatus`) fall back to a humanized label and the raw value.

Don't:

- Don't show raw field names, Title Case labels or numbers (`processingStatus 2 → 1`, `Mods 24 → 8`).
- Don't colour old and new values red and green; only the strike-through and the arrow mark the change.
- Legacy: `components/audit/auditFieldConfig.ts` and `components/audit/AuditDiffDisplay.tsx`. The audit pages move onto these in the next pull request.

Gallery anchor: `/admin/design#format-audit-change`

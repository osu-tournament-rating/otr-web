# Dates, numbers and names

How the site writes dates, numbers, rating changes, rulesets, field names and audited values.
Every formatter uses fixed en-US and UTC and is built so the server and the browser print the same string (issue #1017). Components live in their own files under `@/components/kit/format/`; the pure helpers, with unit tests, under `@/lib/kit/format/`.

- [Rules at a glance](#rules-at-a-glance): the one way to write each kind of value
- [DateText](#datetext): a calendar day, `Jul 20, 2024`
- [DateRangeText](#daterangetext): a span of days, `Jul 20 – Aug 3, 2024`
- [Timestamp](#timestamp): a moment, `Jul 20, 2024, 15:42 UTC`
- [RelativeTime](#relativetime): `3h ago`, for activity feeds only
- [Date helpers](#date-helpers): `formatDate`, `formatDateRange`, `formatTimestamp`, `formatRelativeTime`, `toDate`
- [Number helpers](#number-helpers): counts, ranks, ratings, percentiles, percents, years and IDs
- [RatingDelta](#ratingdelta): a rating change, `↑ +12.3`
- [RulesetName and ruleset names](#rulesetname-and-ruleset-names): `osu!`, `taiko`, `catch`, `mania 4K`, `mania 7K`
- [Field names](#field-names): the glossary, `FIELD_NAMES`
- [Mods](#mods): `HD, HR`
- [Enum labels](#enum-labels): sentence-case names for stored enums
- [Audit values and AuditFieldChange](#audit-values-and-auditfieldchange): labels and values for audit diffs

## Rules at a glance

| Value                 | Write it as                                               | Helper or component                         |
| --------------------- | --------------------------------------------------------- | ------------------------------------------- |
| Day                   | `Jul 20, 2024`                                            | `DateText`, `formatDate`                    |
| Range of days         | `Jul 20 – Aug 3, 2024`, `Jul 20 – 27, 2024`               | `DateRangeText`, `formatDateRange`          |
| Moment                | `Jul 20, 2024, 15:42 UTC` (24-hour)                       | `Timestamp`, `formatTimestamp`              |
| Time since, in a feed | `3h ago`, full timestamp on hover, focus and tap          | `RelativeTime`                              |
| Count                 | `12,345`                                                  | `formatCount`, `formatCountOf`              |
| Rank                  | `#1,234`, everywhere                                      | `formatRank`                                |
| Rating                | `1,835`; `1,834.57` in tooltips and exports               | `formatRating`, `formatRatingPrecise`       |
| Rating change         | `+12.3`, `−4.5`, `0.0`: one decimal, coloured, with arrow | `RatingDelta`, `formatRatingDelta`          |
| Percentile            | `97th percentile` (`97th` under a "Percentile" label)     | `formatPercentile`                          |
| Share                 | `54.2%`                                                   | `formatPercent`                             |
| Accuracy              | `98.54%`                                                  | `formatAccuracy`                            |
| Year, ID              | `2024`, `4012345`: never separated                        | `formatYear`, `formatId`                    |
| Rank restriction      | `Open rank`, `10,000+`                                    | `formatRankRange`                           |
| Lobby size            | `1v1`, `4v4`                                              | `formatLobbySize`                           |
| Ruleset               | `osu!`, `taiko`, `catch`, `mania 4K`, `mania 7K`          | `RulesetName`, `getRulesetLabel`            |
| Mods                  | `HD, HR`, `NM`                                            | `formatMods`                                |
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

Don't:

- Don't use relative time in tables, headers or detail pages. People compare and copy those values.
- Legacy: `components/audit/RelativeTime.tsx` and `formatRelativeTime` in `components/audit/formatRelativeTime.ts` (locale-dependent tooltip, hover only).

Gallery anchor: `/admin/design#format-relative-time`

## Date helpers

Plain functions in `@/lib/kit/format/date` for strings outside JSX: chart axes, tooltips, `aria-label`s, CSV.

```ts
import {
  formatDate,
  formatDateRange,
  formatRelativeTime,
  formatTimestamp,
  toDate,
  toDateTimeAttribute,
} from '@/lib/kit/format/date';

formatDate('2024-07-20T23:30:00-05:00'); // "Jul 21, 2024" (the UTC day)
formatDateRange(start, end, { empty: 'Unknown' });
formatTimestamp(created, { seconds: true });
formatRelativeTime(created, Date.now());
toDate('2024-07-20 15:42:00+00'); // Date, or null when unreadable
```

- All of them take `Date | string | number | null | undefined` and print `empty` (an em dash by default) for missing or unreadable input.
- Strings with no zone (`2024-07-20T15:42:00`) are read as UTC. `new Date()` would read them in the visitor's zone, so always go through `toDate`.
- Month names are written by hand, not by `Intl`, so output is identical on every engine.
- `formatRelativeTime` depends on the clock, so the server and the browser disagree. Never print it straight into server-rendered markup; use `RelativeTime`, which handles hydration.

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

Contrast of the text (WCAG 2, 4.5:1 needed):

| Theme | Direction | Token value | Card  | Panel | Tile  | Popover |
| ----- | --------- | ----------- | ----- | ----- | ----- | ------- |
| Light | Up        | green-800   | 6.7:1 | 6.7:1 | 6.6:1 | 6.3:1   |
| Light | Down      | red-800     | 7.9:1 | 7.9:1 | 7.8:1 | 7.4:1   |
| Light | Flat      | muted       | 4.6:1 | 4.6:1 | 4.6:1 | 4.4:1   |
| Dark  | Up        | green-400   | 10:1  | 9.6:1 | 9.5:1 | 9.5:1   |
| Dark  | Down      | red-500     | 4.7:1 | 4.5:1 | 4.4:1 | 4.4:1   |
| Dark  | Flat      | muted       | 6.5:1 | 6.2:1 | 6.1:1 | 6.0:1   |

Dark red sits at the limit on the panel and just under it on tiles and popovers; the fix belongs in the token (`--destructive-foreground` in `.dark`), not in this component.

Do:

- Put it after the number it changes: `1,835 ↑ +18.7`.

Don't:

- Don't wrap it in a tinted pill or badge. Legacy: `components/rating/RatingDelta.tsx` (pill, `text-green-500` on a 10% tint, about 2.2:1 in light mode), used by the profile match table, profile tournament cards and match stats.
- Don't show two decimals. Legacy: `components/player/PlayerRatingChartTable.tsx` and `PlayerRatingChartTooltip.tsx`.
- Don't put it on `bg-accent` (shadcn tooltips) in dark mode: no red or muted text reaches 4.5:1 there. Use a popover surface.

Gallery anchor: `/admin/design#format-rating-delta`

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
| Forum post URL    | Forum URL                        | `tournaments/TournamentAdminView.tsx`, audit, and the validation messages in `lib/validation-schema.ts` and `lib/orpc/schema/tournament*.ts`                             |
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

## Enum labels

Sentence-case names for the stored enums people read, in `@/lib/kit/format/enum-labels`: tournament, match, game and score rejection reasons; match and game warnings; scoring type; team type (`Team Vs`); team; grade; data fetch status; and beatmap ranked status (`Graveyard` … `Loved`).

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
```

- Every table is keyed by its enum, so a new member fails the type check until it has a name.
- `getFlagLabels` gives one line per set flag, for tooltips and lists; unnamed bits read `Unknown (64)`.
- Verification status names come from the status family (`getVerificationStatusName` in `@/lib/kit/status/verification`).
- Replaces the Title Case texts in `lib/enum-helpers.ts` (`No End Time`, `Head to Head`, `Tag Co-op`) with their sentence-case forms; osu! terms keep the site's spelling (`Team Vs`). Enum numbers never change: they are a contract with the processor.

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
- Values without digits use proportional figures: the body's `tabular-nums` widens Inter's hyphen, so `Pre-verified` would read `Pre - verified`. Do the same (`proportional-nums`) for hyphenated words in your own prose.

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

# Status and badges

How the site shows verification status, report states, small labels and "something new" dots.
The glyph carries the meaning and colour only reinforces it, so every status still reads in greyscale. Import each component from its own file under `@/components/kit/status/` and the copy from `@/lib/kit/status/`.

- [Status sheet](#status-sheet): the five verification states and their names
- [Status copy](#status-copy): names, tooltip lines and the "Not in ratings yet" group
- [VerificationStatusIcon](#verificationstatusicon): status as an icon, for rows and pips
- [VerificationStatusBadge](#verificationstatusbadge): status with its name
- [VerificationStatusTooltip](#verificationstatustooltip): the explanation behind an icon or badge
- [NotInRatings](#notinratings): the muted "Not in ratings yet" label and notice
- [Badge](#badge): the one small label, for mods, rulesets, roles, tags and counts
- [ReportStatusBadge](#reportstatusbadge): a data report's state
- [NotificationDot](#notificationdot): the one "something new" dot
- [CircleDashedX](#circledashedx): the Pre-rejected glyph lucide lacks
- [Legacy inventory](#legacy-inventory): every old badge and dot, with its replacement

## Status sheet

| State        | Glyph                | Hue     | Badge                   | Group                 |
| ------------ | -------------------- | ------- | ----------------------- | --------------------- |
| Verified     | circled check        | green   | filled                  | Counts toward ratings |
| Pre-verified | dashed circled check | green   | dashed outline, no fill | Not in ratings yet    |
| Pending      | clock                | neutral | filled                  | Not in ratings yet    |
| Pre-rejected | dashed circled cross | red     | dashed outline, no fill | Not in ratings yet    |
| Rejected     | circled cross        | red     | filled                  | Not counted           |

- The glyph says the outcome; a dashed outline says an automated check decided, a solid one says an admin did. The badge repeats this: filled for a person's decision, a dashed outline with no fill for an automated check.
- Each state has exactly one name, everywhere: never "Awaiting review", "Pre-Verified" or "Pre-approved".
- Pending is `VerificationStatus.None`. Statuses are compared by identity only. Their numbers are not ordered by meaning, so never write `status < VerificationStatus.Verified` or sort by the number; use `VERIFICATION_STATUS_ORDER` for display order.
- Icons and badges take the outcome's hue, so Pre-verified is green and Pre-rejected red. Charts, summaries and filters group the states into three: Verified, "Not in ratings yet" (one neutral bar for Pending, Pre-verified and Pre-rejected) and Rejected. Pending is never a bar or series of its own.
- Colours come from the verification palette in `globals.css` (`--verification-verified`, `--verification-rejected`, `--verification-neutral`), not from mods, tiers or the categorical chart palette. Outside these components, use the colour family's helpers in `@/lib/kit/color/verification`: `getVerificationStatusColor(status)` for a status mark and `getRatingsGroupColor(status)` for a chart fill.

Gallery anchor: `/admin/design#status-sheet`

## Status copy

Plain TypeScript in `@/lib/kit/status/verification`, `report`, `reasons` and `count`, with unit tests. Use it instead of `VerificationStatusEnumHelper` or `ReportStatusEnumHelper` text in new UI.

```ts
import {
  NOT_IN_RATINGS_YET_LABEL,
  RATING_FAQ_URL,
  RATINGS_GROUPS,
  VERIFICATION_STATUS_ORDER,
  getRatingsGroup,
  getVerificationStatusName,
  getVerificationStatusTooltip,
  isNotInRatingsYet,
} from '@/lib/kit/status/verification';
import {
  getRejectionReasonTexts,
  getWarningTexts,
} from '@/lib/kit/status/reasons';
import { formatBadgeCount } from '@/lib/kit/status/count';

getVerificationStatusTooltip(VerificationStatus.PreVerified);
// "Pre-verified: passed automated checks. Not counted in ratings until an admin verifies it."
isNotInRatingsYet(tournament.verificationStatus); // Pending, Pre-verified, Pre-rejected
getWarningTexts('match', match.warningFlags); // ["Low game count", …]
formatBadgeCount(140); // "99+"
```

- `getVerificationStatusName(status)`: the one name. `getVerificationStatusTooltip(status)`: "<name>: <plain-language line>", for a title, a chart tooltip or an `aria-description`.
- `getVerificationStatusLabel(status, { context, hasWarnings })`: the accessible name of an icon on its own, such as "Game 3: Pre-verified, with warnings".
- `isNotInRatingsYet(status)`, `NOT_IN_RATINGS_YET_STATUSES` and `NOT_IN_RATINGS_YET_LABEL`: the group of the three undecided states.
- `getVerificationStatusHue(status)` and `isAutomatedCheckStatus(status)`: the hue of an icon or badge (`success`, `neutral`, `destructive`) and whether it gets the dashed outline.
- `RATINGS_GROUPS` and `getRatingsGroup(status)`: the three chart groups in order, with a label and a hue (`success`, `neutral`, `destructive`).
- `RATING_FAQ_URL`: the Rating FAQ answer on why a tournament is not in ratings.
- `getWarningTexts(entityType, flags)` and `getRejectionReasonTexts(entityType, reason)`: one sentence-case line per set bitflag: the entity's labels from the format family, split by its `getFlagLabels`. They replace the switch statements inside the old `VerificationBadge`.
- `REPORT_STATUS_COPY` and `getReportStatusTooltip(status)`: Pending, Confirmed and Dismissed, with their tones.
- `formatBadgeCount(count, max = 99)`: a count for a badge, with thousands separators, capped as "99+".

Don't:

- Don't write status names or explanations inline. If the wording is wrong, change it in `lib/kit/status/verification.ts` and its tests.
- Don't treat `0` or a falsy status as "no status": `VerificationStatus.None` is Pending.

## VerificationStatusIcon

Status without its name, for table cells, game pips, list rows and next to a heading. Warnings add a small amber triangle beside the icon; they never recolour it.

```tsx
import { VerificationStatusIcon } from '@/components/kit/status/VerificationStatusIcon';
import {
  getRejectionReasonTexts,
  getWarningTexts,
} from '@/lib/kit/status/reasons';

<VerificationStatusIcon
  status={game.verificationStatus}
  warnings={getWarningTexts('game', game.warningFlags)}
  rejectionReasons={getRejectionReasonTexts('game', game.rejectionReason)}
  context={`Game ${index + 1}`}
  tooltip="tap"
/>;
```

Props that matter:

- `status`: a `VerificationStatus`.
- `size`: `sm` (14px) inside a line of text, `md` (16px, default) in rows and cells, `lg` (20px) next to a page or section heading.
- `tooltip`: `tap` opens on tap, hover and focus (it renders a button); `hover` adds no button, for an icon inside a link. Leave it out only when the name is written next to the icon.
- `warnings`, `rejectionReasons`, `reviewer`, `context`: what the tooltip lists. Any warning shows the marker.
- `decorative`: hides the icon from assistive tech when the name is already beside it.

Related exports in the same file: `VerificationStatusGlyph` (the bare coloured glyph, for legends) and `StatusWarningMarker` (the triangle on its own).

Do:

- Give every icon on its own a tooltip. Without one it still has an accessible name (`role="img"`), but sighted visitors cannot learn what the glyph means.
- Use `context` when several icons sit together, such as the game pips of a match row, so each one is named ("Game 3: Rejected").
- Keep tap icons at least 8px apart (`gap-2`): the icon is a 16px target, and the gap gives each one the 24px tap area WCAG 2.5.8 asks for.
- Inside a whole-row link, use `tooltip="hover"` and make sure the row also says the status in words, or use `NotInRatings`.

Don't:

- Don't put the icon in a tinted chip or a coloured square. The old `VerificationBadge` (`components/badges/VerificationBadge.tsx`) does that with `size="pip"|"xsmall"|"small"` and `minimal`; all of those become this icon.
- Don't colour a status with `text-orange-500` for warnings (the old badge does). Pass `warnings` instead.
- Don't pick status glyphs from lucide by hand (`CircleCheck` or its alias `CheckCircle2`, `CircleX` or `XCircle`, `AlertTriangle`, `Square`); the old badge used a square for Pre-verified and a triangle for Pre-rejected. Render this component, or `VerificationStatusGlyph` in a legend.

Gallery anchor: `/admin/design#status-verification-icon`

## VerificationStatusBadge

Status as glyph plus name, for detail heroes, game and match card headers, dialogs and audit diffs. The hue follows the outcome: green for Verified and Pre-verified, neutral for Pending, red for Pre-rejected and Rejected. An admin's decision is a filled badge; an automated check is a dashed outline with no fill.

```tsx
import { VerificationStatusBadge } from '@/components/kit/status/VerificationStatusBadge';

<VerificationStatusBadge
  status={tournament.verificationStatus}
  rejectionReasons={getRejectionReasonTexts(
    'tournament',
    tournament.rejectionReason
  )}
  reviewer={tournament.verifiedByUsername}
  tooltip="tap"
/>;
```

Props that matter:

- `size`: `sm` (20px) in dense rows and diffs, `md` (24px, default) in headers and dialogs, `lg` (32px) in a hero next to the 30px title.
- `variant`: `soft` (default) on any surface; `overlay` only on cover art, inside the card's `dark` wrapper.
- `tooltip`, `warnings`, `rejectionReasons`, `reviewer`, `context`: as for the icon.

Do:

- Use the badge where there is room for the word, and the icon where there is not. Don't use both for the same item.
- For an audit diff's old value, strike it through: `className="line-through"`.

Don't:

- Don't replace the badge's name with "Awaiting review" or add an amber "pending" pill next to it. The "what counts" message is `NotInRatings`.
- Don't build a status pill by hand from `Badge`; the tone, outline, glyph and copy must stay together.
- Don't recolour the badge by ratings group. "Not in ratings yet" is said in words by `NotInRatings`, and in charts by the neutral bar.

Gallery anchor: `/admin/design#status-verification-badge`

## VerificationStatusTooltip

The explanation behind a status icon or badge: the name and its plain-language line, then who verified or rejected it, the warnings and the rejection reasons. The icon and badge use it through their `tooltip` prop; wrap something else with it only when that something is the status trigger.

```tsx
import {
  VerificationStatusDetails,
  VerificationStatusTooltip,
} from '@/components/kit/status/VerificationStatusTooltip';

<VerificationStatusTooltip
  mode="tap"
  label={getVerificationStatusLabel(status)}
  status={status}
>
  {trigger}
</VerificationStatusTooltip>;
```

- `mode="tap"` uses `TapTooltip` (a button that opens on tap, hover and focus); `mode="hover"` uses `SimpleTooltip` and adds no button.
- `VerificationStatusDetails` is the body on its own, for a chart tooltip or a popover that already exists.

Gallery anchor: `/admin/design#status-verification-icon`

## NotInRatings

Says data does not count toward ratings yet, for Pending, Pre-verified and Pre-rejected; it renders nothing for Verified and Rejected, so pass the status unconditionally.

```tsx
import { NotInRatings } from '@/components/kit/status/NotInRatings';

// In a list row, on the meta line:
<NotInRatings status={tournament.verificationStatus} />

// Once, under a tournament page's header:
<NotInRatings status={tournament.verificationStatus} variant="notice" />
```

Props that matter:

- `variant`: `label` (default) is muted 12px text, "Not in ratings yet"; `notice` is a muted 14px sentence ending in a "Read the rating FAQ" link.
- `subject`: `tournament` (default) or `match`, the noun the notice uses.

Do:

- Use the label on the tournament list, search results and profile tournament cards, beside or under the row's meta line.
- Use the notice once per detail page, directly under the hero.

Don't:

- Don't show the amber "Awaiting review" pill with a dot (`components/tournaments/TournamentListRow.tsx`). It is replaced by this label.
- Don't colour the label; it is information, not a warning.

Gallery anchor: `/admin/design#status-not-in-ratings`

## Badge

The one small label. It replaces about 15 hand-made label styles: pick a tone for meaning, a size for the line it sits in, and `customColor` or `swatch` for a domain palette. It is a `span`, not a control.

```tsx
import { Badge } from '@/components/kit/status/Badge';

<Badge>lazer</Badge>
<Badge tone="destructive" size="sm">Beatmap not pooled</Badge>
<Badge variant="solid" tone="primary" size="sm">{formatBadgeCount(count)}</Badge>
<Badge customColor={{ background: getModPaletteColor(mods), foreground: MOD_FILL_FOREGROUND }}>
  {getBeatmapModLabel(mods)}
</Badge>
<Badge variant="outline" swatch={getModPaletteColor(Mods.HardRock)}>HR 1,204</Badge>
```

Props that matter:

- `tone`: `neutral` (default), `primary`, `success`, `warning`, `destructive`.
- `variant`: `soft` (default, tinted fill); `outline` (no fill, for tinted surfaces such as tiles and for quiet tags); `solid` (full fill, for counts; only `neutral`, `primary` and `success`); `overlay` (on cover art only).
- `size`: `sm` 20px, `md` 24px (default), `lg` 32px. A lucide icon as a direct child is sized for you (12, 14 or 16px).
- `shape`: `pill` (default) or `rounded` (6px corners). Use `rounded` only where a pill would read as a button, such as a row of chips next to real buttons.
- `customColor`: `{ background, foreground }` for a solid domain fill (mods, star rating). Pass CSS colours, usually `var(--…)` from a palette helper.
- `swatch`: a domain colour shown as the 8px chip in front of the label (mod share, tiers, grades, rank ranges, teams).

When to pick each:

- Status: never by hand; use `VerificationStatusBadge` or `ReportStatusBadge`.
- Mods: `customColor` with `getModPaletteColor(mods)` and `MOD_FILL_FOREGROUND` from `@/lib/kit/color/mods` (the reviewed mod palette; every entry takes black text), or `swatch={getModPaletteColor(mods)}` beside a count. The label comes from `getBeatmapModLabel` in `@/lib/utils/mods`. The older `getModColor` and `getModForegroundColor` in that file are the legacy palette.
- Tiers: `swatch={getTierColor(tierName)}` from `@/lib/kit/color/tiers`.
- Rulesets: neutral soft with `RulesetIcon` (`className="fill-current"`) and the label from `getRulesetLabel` (`@/lib/kit/format/ruleset`): osu!, taiko, catch, mania 4K, mania 7K.
- Roles: neutral soft with an icon (`ShieldCheck` Admin, `UserCheck` Verifier). Never red.
- Tags: `lazer` is neutral outline. "Includes unverified" is a notice, not a tag: use `CalloutChip icon={ShieldQuestion}` with `detail` from `@/components/kit/feedback/CalloutChip` (see [feedback.md](feedback.md#calloutchip)).
- Counts: solid primary `sm` inside a Filters button (`FilterButton` from `@/components/kit/lists/FilterButton` already renders it) or next to a menu item; neutral soft for a plain total ("1,204 matches"). Format with `formatBadgeCount` or the format family's `formatCount`, never a bare number above 999.
- Failure reasons and other problems: destructive soft, `sm`.

Do:

- Keep labels short and in sentence case. Badges never wrap.
- Wrap a badge that needs explaining in `TapTooltip` (`@/components/tap-tooltip`), so the explanation opens on tap as well as hover.

Don't:

- Don't use `@/components/ui/badge` in new code; it stays only as the shadcn primitive. Don't edit it to add tones.
- Don't add `text-white`, `bg-blue-500`, `text-orange-500` or other palette classes to a badge, and don't stack `className` overrides for height and padding (`h-5 px-1.5 py-0 text-xs`); pick a `size`.
- Don't use red for something that is not an error or a rejection, such as the Admin role (`components/profile/ProfileRoleBadge.tsx`).
- Don't make a badge clickable. A removable or toggleable chip is a control (see the lists and controls references), not a badge.

Gallery anchors: `/admin/design#status-badge`, `/admin/design#status-badge-uses`

## ReportStatusBadge

A data report's state on My reports and the admin queue, in the same status language: Pending (clock, neutral), Confirmed (circled check, green) or Dismissed (circled cross, red). The names are the ones the report pages and the admin's Confirm report and Dismiss buttons already use.

```tsx
import { ReportStatusBadge } from '@/components/kit/status/ReportStatusBadge';

<ReportStatusBadge status={report.status} tooltip="tap" />;
```

- `size` as for Badge; `tooltip` adds the plain-language line ("Dismissed: an admin reviewed it and found nothing to change."), `tap` or `hover` as for the verification components.

Don't:

- Don't keep the two copies of `getStatusBadge` in `app/reports/MyReportsClient.tsx` and `app/admin/reports/AdminReportsClient.tsx` (secondary, `bg-success text-green-950` and solid red). Both become this component.

Gallery anchor: `/admin/design#status-report-badge`

## NotificationDot

The one "something new" dot: unseen reports on the Admin menu item, an unread report update, notes on an entity. One colour everywhere (`--notification`), with its own screen-reader text.

```tsx
import { NotificationDot } from '@/components/kit/status/NotificationDot';

// After a label, such as the header's Admin menu item:
<button type="button">
  Admin <NotificationDot label="Unseen reports" />
</button>

// On the corner of an avatar or icon button (the parent must be `relative`):
<span className="relative inline-flex">
  <OsuAvatar … />
  <NotificationDot placement="corner" label="Unread report updates" />
</span>
```

Props that matter:

- `label`: required; what is new, as screen readers should hear it.
- `placement`: `inline` (default) or `corner`, which pins it to the top-right of a `relative` parent with a ring in the page background. On a card or popover, pass `className="ring-card"` or `ring-popover`.

Do:

- Show the dot after the header's "Admin" dropdown label when there are unseen reports or other admin notifications, and the unseen count as a solid primary `sm` `Badge` with `formatBadgeCount` on the Reports item inside the menu. The admin home's own item is labelled "Admin".
- When the parent control is named with `aria-label`, put the news in that label too ("Admin notes (has notes)"); an `aria-label` hides the dot's own text.

Don't:

- Don't draw dots by hand: `bg-blue-500` in `components/profile/ProfileCard.tsx` and `app/reports/MyReportsClient.tsx`, `bg-yellow-600 dark:bg-yellow-400` in `components/admin-notes/AdminNoteView.tsx`.
- Don't use the dot for status or as a bullet; it only means "new since you last looked".

Gallery anchor: `/admin/design#status-notification-dot`

## CircleDashedX

The Pre-rejected glyph, a lucide-style icon drawn locally because lucide has none: the outline of `circle-dashed-check` with the cross of `circle-x`. You rarely need it directly; `VerificationStatusIcon` uses it.

```tsx
import { CircleDashedX } from '@/components/kit/status/CircleDashedX';
```

## Legacy inventory

Every label, status and dot style that exists today, and what replaces it in the migration.

| Today                                                             | Where                                                                                                                                                                                                                                                                                                             | Replacement                                                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VerificationBadge` with `displayText`                            | `components/badges/VerificationBadge.tsx`, used in `app/tournaments/[id]/page.tsx`, `components/matches/MatchCard.tsx`, `components/matches/MergeMatchButton.tsx`, `components/player/PlayerTournamentCard.tsx`, `components/search/results/TournamentResultContent.tsx`, `components/audit/AuditDiffDisplay.tsx` | `VerificationStatusBadge` (`overlay` on cover art); `strikethrough` becomes `className="line-through"`                                           |
| `VerificationBadge` without text, `pip`, `minimal`                | `components/games/GameCardHeader.tsx`, `components/games/ScoreCard.tsx`, `components/tournaments/MatchLedgerRow.tsx`, `components/beatmap/BeatmapPoolsDialog.tsx`, `components/audit/CascadeContextBanner.tsx`                                                                                                    | `VerificationStatusIcon` with `tooltip="tap"`; `interactive={false}` becomes `tooltip="hover"`; `gameIndex` becomes `context="Game N"`           |
| `warningFlags`, `rejectionReason`, `entityType` props             | same                                                                                                                                                                                                                                                                                                              | `warnings={getWarningTexts(type, flags)}`, `rejectionReasons={getRejectionReasonTexts(type, reason)}`                                            |
| Amber "Awaiting review" pill                                      | `components/tournaments/TournamentListRow.tsx`                                                                                                                                                                                                                                                                    | `NotInRatings` label                                                                                                                             |
| `LazerBadge`                                                      | `components/badges/LazerBadge.tsx`                                                                                                                                                                                                                                                                                | `<Badge variant="outline">lazer</Badge>`                                                                                                         |
| `UnverifiedDataBadge`                                             | `components/badges/UnverifiedDataBadge.tsx`, in `components/beatmap/BeatmapDistributionsCard.tsx`                                                                                                                                                                                                                 | `CalloutChip icon={ShieldQuestion} detail=…` from `@/components/kit/feedback/CalloutChip`                                                        |
| `StatusIcon` (pass or fail, `text-green-600` / `text-red-600`)    | `components/filtering/StatusIcon.tsx`, in `FilteringResultsTable.tsx`                                                                                                                                                                                                                                             | Not a verification status: `<Badge tone="success" size="sm"><Check />Passed</Badge>` / `<Badge tone="destructive" size="sm"><X />Failed</Badge>` |
| `FailureReasonsBadges` (solid red)                                | `components/filtering/FailureReasonsBadges.tsx`                                                                                                                                                                                                                                                                   | `Badge tone="destructive" size="sm"` (soft)                                                                                                      |
| Report `getStatusBadge`                                           | `app/reports/MyReportsClient.tsx`, `app/admin/reports/AdminReportsClient.tsx`                                                                                                                                                                                                                                     | `ReportStatusBadge`                                                                                                                              |
| "Legacy report details" field badges                              | `app/admin/reports/AdminReportsClient.tsx`                                                                                                                                                                                                                                                                        | `Badge` neutral                                                                                                                                  |
| Admin role badge (solid red)                                      | `components/profile/ProfileRoleBadge.tsx`                                                                                                                                                                                                                                                                         | `<Badge><ShieldCheck />Admin</Badge>` in its tooltip                                                                                             |
| Banned or Active badge, API key count                             | `app/admin/AdminDashboardClient.tsx`                                                                                                                                                                                                                                                                              | `Badge tone="destructive"` "Banned" / neutral "Active"; `Badge variant="outline"` count                                                          |
| Report count pill (`bg-blue-500 text-white`)                      | `components/profile/ProfileCard.tsx`                                                                                                                                                                                                                                                                              | `Badge variant="solid" tone="primary" size="sm"` with `formatBadgeCount`                                                                         |
| Unread dots (`bg-blue-500`)                                       | `components/profile/ProfileCard.tsx` (menu and avatar), `app/reports/MyReportsClient.tsx`                                                                                                                                                                                                                         | `NotificationDot` (`placement="corner"` on the avatar)                                                                                           |
| Admin notes dot (yellow)                                          | `components/admin-notes/AdminNoteView.tsx`                                                                                                                                                                                                                                                                        | `NotificationDot placement="corner"`                                                                                                             |
| Audit action badges (`ACTION_BADGE_COLORS`, `ACTION_TEXT_COLORS`) | `components/audit/AuditEntryRow.tsx`, `lib/audit-actions.ts`                                                                                                                                                                                                                                                      | One `VerificationStatusIcon` for verification events; plain text verbs otherwise (audit redesign)                                                |
| Audit filter counts (`secondary h-5 px-1`)                        | `components/audit/AuditFilterBar.tsx`                                                                                                                                                                                                                                                                             | `Badge variant="solid" tone="primary" size="sm"`                                                                                                 |
| Filter count bubbles (`bg-primary size-5 rounded-full`)           | `components/tournaments/list/TournamentListFilter.tsx`, `components/beatmaps/list/BeatmapListFilter.tsx`                                                                                                                                                                                                          | `Badge variant="solid" tone="primary" size="sm"`                                                                                                 |
| Mod pills (`li` with `getModColor`)                               | `components/beatmaps/BeatmapTopMods.tsx`                                                                                                                                                                                                                                                                          | `Badge customColor` with `getModPaletteColor` inside the `li`                                                                                    |
| Freemod picks (outline badge and `Swatch`)                        | `components/beatmap/BeatmapDistributionsCard.tsx`                                                                                                                                                                                                                                                                 | `Badge variant="outline" swatch=…`                                                                                                               |
| Team and Winner badges (outline, `bg-popover`)                    | `components/matches/MatchStatsPlayerRow.tsx`                                                                                                                                                                                                                                                                      | `Badge variant="outline" swatch="var(--team-red)"`; `<Badge><Trophy />Winner</Badge>`                                                            |
| `RulesetPill`, `StarRatingPill`, `beatmapPillVariants`            | `components/beatmaps/`                                                                                                                                                                                                                                                                                            | Equivalent to `Badge` `md`/`lg` with `neutral`, `overlay` or `customColor`; new code uses `Badge`                                                |
| `RankBadge`                                                       | `components/beatmap/BeatmapLeaderboardCard.tsx`                                                                                                                                                                                                                                                                   | Stays: it is a rank cell, not a label                                                                                                            |
| Removable player chips, multi-select values                       | `components/beatmap/PlayerPicker.tsx`, `components/select/multiple-select.tsx`                                                                                                                                                                                                                                    | Not badges: these are input chips, a control (see the lists and controls references)                                                             |
| shadcn `Badge`                                                    | `components/ui/badge.tsx`                                                                                                                                                                                                                                                                                         | Leave the file; new code imports `@/components/kit/status/Badge`                                                                                 |

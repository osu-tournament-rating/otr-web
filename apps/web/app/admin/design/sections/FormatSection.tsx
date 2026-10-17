import type * as React from 'react';
import { AuditEntityType, Ruleset, VerificationStatus } from '@otr/core/osu';

import { CountryFlag, CountryName } from '@/components/kit/country/CountryFlag';
import {
  AuditChangeList,
  AuditFieldChange,
} from '@/components/kit/format/AuditFieldChange';
import { DateRangeText } from '@/components/kit/format/DateRangeText';
import { DateText } from '@/components/kit/format/DateText';
import { RatingDelta } from '@/components/kit/format/RatingDelta';
import { RelativeTime } from '@/components/kit/format/RelativeTime';
import { RulesetName } from '@/components/kit/format/RulesetName';
import { TimeRangeText } from '@/components/kit/format/TimeRangeText';
import { Timestamp } from '@/components/kit/format/Timestamp';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import { getCountryOptions } from '@/lib/kit/format/country';
import { formatDuration } from '@/lib/kit/format/date';
import {
  FIELD_NAMES,
  type FieldName,
  formatLobbySize,
  formatRankRange,
} from '@/lib/kit/format/fields';
import {
  formatAccuracy,
  formatCount,
  formatId,
  formatPercent,
  formatPercentile,
  formatRank,
  formatRating,
  formatRatingPrecise,
  formatYear,
} from '@/lib/kit/format/number';
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';
import { formatTierName, type TierName } from '@/lib/kit/format/tier';

import { GallerySection, Specimen } from '../gallery';
import { CountryComboboxDemo } from './CountryComboboxDemo';

const DURATIONS: Array<{
  label: string;
  seconds: number | null;
  hint?: string;
}> = [
  { label: 'Beatmap length', seconds: 124, hint: 'formatDuration(124)' },
  { label: 'An hour or more', seconds: 3724, hint: 'formatDuration(3724)' },
  { label: 'Fractions', seconds: 124.9, hint: 'Dropped, not rounded' },
  { label: 'No length', seconds: null, hint: 'An em dash' },
];

const TIER_NAMES: Array<{
  label: string;
  tier: TierName;
  subTier?: number;
  hint?: string;
}> = [
  { label: 'Top of a tier', tier: 'Gold', subTier: 1 },
  { label: 'Bottom of a tier', tier: 'Diamond', subTier: 3 },
  {
    label: 'No subtier',
    tier: 'Platinum',
    hint: 'formatTierName(tier), for a tier legend',
  },
  { label: 'Elite Grandmaster', tier: 'Elite Grandmaster', subTier: 1 },
];

/** Fixed "now" for the relative times, so the gallery never changes. */
const NOW = '2024-08-04T18:00:00Z';

/** The admin in the demo feed and audit values. */
const REVIEWER = 'apricot';

/** A label beside its value, the way the specimens list examples. */
function Example({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span className="min-w-0">{children}</span>
        {hint ? (
          <span className="text-xs break-words text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function Examples({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col gap-3">{children}</dl>;
}

const RANGES: Array<{
  label: string;
  start: string | null;
  end: string | null;
}> = [
  { label: 'Same year', start: '2024-07-20', end: '2024-08-03' },
  { label: 'Same month', start: '2024-07-20', end: '2024-07-27' },
  { label: 'One day', start: '2024-07-20', end: '2024-07-20' },
  { label: 'Across years', start: '2023-12-28', end: '2024-01-04' },
  { label: 'No end date', start: '2024-07-20', end: null },
  { label: 'No start date', start: null, end: '2024-08-03' },
  { label: 'No dates', start: null, end: null },
];

const TIME_RANGES: Array<{
  label: string;
  start: string | null;
  end: string | null;
  seconds?: boolean;
  showDate?: boolean;
}> = [
  {
    label: 'Game times',
    start: '2024-07-20T15:42:07Z',
    end: '2024-07-20T15:45:30Z',
    seconds: true,
  },
  {
    label: 'With the day',
    start: '2024-07-20T15:42:07Z',
    end: '2024-07-20T15:45:30Z',
    showDate: true,
  },
  {
    label: 'Across midnight',
    start: '2024-07-20T23:58:01Z',
    end: '2024-07-21T00:02:10Z',
    seconds: true,
  },
  { label: 'No end time', start: '2024-07-20T15:42:07Z', end: null },
  { label: 'No times', start: null, end: null },
];

/** Players' countries as osu! stores them, `XX` being osu!'s "unknown". */
const FLAG_CODES = ['AU', 'KR', 'JP', 'US', 'PL', 'BR', 'XX'];

/** Newest first, as feeds are. */
const FEED = [
  {
    who: REVIEWER,
    action: 'verified',
    what: 'OWC2024: (United States) vs (South Korea)',
    at: '2024-08-04T17:38:00Z',
  },
  {
    who: 'System',
    action: 'pre-verified',
    what: 'OWC2024: (United States) vs (South Korea)',
    at: '2024-08-04T14:51:00Z',
  },
  {
    who: 'mrekk',
    action: 'submitted',
    what: 'Corsace Open 2024',
    at: '2024-07-29T09:12:00Z',
  },
  {
    who: REVIEWER,
    action: 'rejected',
    what: '5WC2023: (Germany) vs (Poland)',
    at: '2024-06-02T21:05:00Z',
  },
];

const NUMBERS: Array<{ label: string; value: string; hint: string }> = [
  { label: 'Count', value: formatCount(12345), hint: 'formatCount(12345)' },
  { label: 'Rank', value: formatRank(1234), hint: 'formatRank(1234)' },
  {
    label: 'Rating',
    value: `${formatRating(1834.567)} (${formatRatingPrecise(1834.567)})`,
    hint: 'formatRating, formatRatingPrecise',
  },
  {
    label: 'Percentile',
    value: formatPercentile(97.53),
    hint: 'formatPercentile(97.53)',
  },
  {
    label: 'Win rate',
    value: formatPercent(0.5423),
    hint: 'formatPercent(0.5423)',
  },
  {
    label: 'Accuracy',
    value: formatAccuracy(0.98543),
    hint: 'formatAccuracy(0.98543)',
  },
  {
    label: 'Rank restriction',
    value: `${formatRankRange(1)}, ${formatRankRange(10000)}`,
    hint: 'formatRankRange(1), formatRankRange(10000)',
  },
  {
    label: 'Lobby size',
    value: formatLobbySize(4),
    hint: 'formatLobbySize(4)',
  },
  {
    label: 'Year',
    value: formatYear(2024),
    hint: 'formatYear: never separated',
  },
  {
    label: 'osu! ID',
    value: formatId(4012345),
    hint: 'formatId: never separated',
  },
];

/** Glossary entries that replace a different name, not just its Title Case. */
const RETIRED_NAMES = (Object.values(FIELD_NAMES) as FieldName[])
  .map((entry) => ({
    ...entry,
    replaces: (entry.legacy ?? []).filter(
      (name, index, names) =>
        name.toLowerCase() !== entry.label.toLowerCase() &&
        names.findIndex(
          (other) => other.toLowerCase() === name.toLowerCase()
        ) === index
    ),
  }))
  .filter((entry) => entry.replaces.length > 0);

const AUDIT_USERS = { '12': { username: REVIEWER } };

const AUDIT_CHANGES: Array<{
  entityType: AuditEntityType;
  field: string;
  originalValue: unknown;
  newValue: unknown;
}> = [
  {
    entityType: AuditEntityType.Game,
    field: 'mods',
    originalValue: 24,
    newValue: 8,
  },
  {
    entityType: AuditEntityType.Game,
    field: 'startTime',
    originalValue: '2024-07-20T15:40:12+00:00',
    newValue: '2024-07-20T15:42:07+00:00',
  },
  {
    entityType: AuditEntityType.Match,
    field: 'verificationStatus',
    originalValue: VerificationStatus.PreVerified,
    newValue: VerificationStatus.Verified,
  },
  {
    entityType: AuditEntityType.Match,
    field: 'verifiedByUserId',
    originalValue: null,
    newValue: 12,
  },
  {
    entityType: AuditEntityType.Tournament,
    field: 'rankRangeLowerBound',
    originalValue: 1,
    newValue: 10000,
  },
  {
    entityType: AuditEntityType.Tournament,
    field: 'lobbySize',
    originalValue: 3,
    newValue: 4,
  },
  {
    entityType: AuditEntityType.Game,
    field: 'rejectionReason',
    originalValue: 0,
    newValue: 6,
  },
];

export default function FormatSection() {
  // Worked out here, on the server, and handed to the client demo.
  const countryOptions = getCountryOptions();

  return (
    <GallerySection
      id="format"
      title="Dates, numbers and names"
      description="How dates, numbers, rulesets and field names are written. Every formatter uses en-US and UTC, so the server and the browser print the same text."
    >
      <Specimen
        id="format-date"
        name="DateText"
        importPath="@/components/kit/format/DateText"
        description="A calendar day in UTC. Use it when the day matters and the time does not."
      >
        <Examples>
          <Example label="Played">
            <DateText date="2024-07-20T15:42:07Z" />
          </Example>
          <Example label="No date">
            <DateText date={null} />
          </Example>
        </Examples>
      </Specimen>

      <Specimen
        id="format-date-range"
        name="DateRangeText"
        importPath="@/components/kit/format/DateRangeText"
        description="A span of days, sharing the month and year where both ends do. Use it for tournament dates."
      >
        <Examples>
          {RANGES.map((range) => (
            <Example key={range.label} label={range.label}>
              <DateRangeText start={range.start} end={range.end} />
            </Example>
          ))}
        </Examples>
      </Specimen>

      <Specimen
        id="format-timestamp"
        name="Timestamp"
        importPath="@/components/kit/format/Timestamp"
        description="A moment in UTC on a 24-hour clock, with the zone written out. Add seconds only where two events can share a minute."
      >
        <Examples>
          <Example label="Start time">
            <Timestamp date="2024-07-20T15:42:07Z" />
          </Example>
          <Example label="With seconds">
            <Timestamp date="2024-07-20T15:42:07Z" seconds />
          </Example>
          <Example label="No time">
            <Timestamp date={null} />
          </Example>
        </Examples>
      </Specimen>

      <Specimen
        id="format-time-range"
        name="TimeRangeText"
        importPath="@/components/kit/format/TimeRangeText"
        description="Two moments within a day, such as a game's start and end, in UTC. The day is left out unless asked for, so use it where the day is already on the page; ends on different days always carry their dates."
      >
        <Examples>
          {TIME_RANGES.map((range) => (
            <Example key={range.label} label={range.label}>
              <TimeRangeText
                start={range.start}
                end={range.end}
                seconds={range.seconds}
                showDate={range.showDate}
              />
            </Example>
          ))}
        </Examples>
      </Specimen>

      <Specimen
        id="format-relative-time"
        name="RelativeTime"
        importPath="@/components/kit/format/RelativeTime"
        description="Time since an event, for activity feeds only. Hover, focus or tap it for the full UTC timestamp. These use a fixed clock; on a page it keeps itself current."
      >
        <ul className="flex flex-col divide-y text-sm">
          {FEED.map((item) => (
            <li
              key={item.at}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0"
            >
              <span className="min-w-0">
                {item.who} {item.action} {item.what}
              </span>
              <RelativeTime
                date={item.at}
                now={NOW}
                className="text-xs text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen
        id="format-numbers"
        name="Number formatters"
        importPath="@/lib/kit/format/number"
        description="One formatter per kind of number. Counts, ranks and ratings get thousands separators; years and IDs are labels and never do. Percentiles are whole ordinals."
      >
        <Examples>
          {NUMBERS.map((row) => (
            <Example key={row.label} label={row.label} hint={row.hint}>
              {row.value}
            </Example>
          ))}
        </Examples>
      </Specimen>

      <Specimen
        id="format-duration"
        name="formatDuration and parseDuration"
        importPath="@/lib/kit/format/date"
        description="A length in seconds, such as a beatmap's: minutes and seconds, with hours from an hour. parseDuration reads the same text back, for a length typed into a form."
      >
        <Examples>
          {DURATIONS.map((row) => (
            <Example key={row.label} label={row.label} hint={row.hint}>
              <span className="tabular-nums">
                {formatDuration(row.seconds)}
              </span>
            </Example>
          ))}
        </Examples>
      </Specimen>

      <Specimen
        id="format-tier-name"
        name="formatTierName"
        importPath="@/lib/kit/format/tier"
        description="A tier and its subtier as a roman numeral, I at the top of a tier and III at the bottom. Without a subtier, the tier alone, as on a chart's tier legend. Elite Grandmaster has no subtiers."
      >
        <Examples>
          {TIER_NAMES.map((row) => (
            <Example key={row.label} label={row.label} hint={row.hint}>
              {formatTierName(row.tier, row.subTier)}
            </Example>
          ))}
        </Examples>
      </Specimen>

      <Specimen
        id="format-rating-delta"
        name="RatingDelta"
        importPath="@/components/kit/format/RatingDelta"
        description="A rating change: coloured text with an arrow and one decimal, never a pill. It takes the size of the text around it."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <RatingDelta value={12.34} />
            <RatingDelta value={-4.56} />
            <RatingDelta value={0.03} />
            <RatingDelta value={152.9} />
          </div>
          <StatTileGrid columns={2}>
            <StatTile
              label="Rating"
              value={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  {formatRating(1834.567)}
                  <RatingDelta value={18.7} className="text-sm" />
                </span>
              }
            />
            <StatTile
              label="Volatility"
              value={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  212.4
                  <RatingDelta value={-6.2} lowerIsBetter className="text-sm" />
                </span>
              }
            />
          </StatTileGrid>
          <p className="text-xs text-muted-foreground">
            Volatility uses{' '}
            <span className="text-foreground">lowerIsBetter</span>: a fall is
            green, and the arrow still points down.
          </p>
        </div>
      </Specimen>

      <Specimen
        id="format-ruleset"
        name="RulesetName"
        importPath="@/components/kit/format/RulesetName"
        description="A ruleset's icon and short name. Icon only where space is tight; its tooltip gives the full name and opens on tap."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {RATED_RULESETS.map((ruleset) => (
              <RulesetName key={ruleset} ruleset={ruleset} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Icon only
            </span>
            {RATED_RULESETS.map((ruleset) => (
              <RulesetName key={ruleset} ruleset={ruleset} iconOnly />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Without icon
            </span>
            <RulesetName
              ruleset={Ruleset.Mania4k}
              showIcon={false}
              className="text-sm"
            />
          </div>
        </div>
      </Specimen>

      <Specimen
        id="format-country-flag"
        name="CountryFlag"
        importPath="@/components/kit/country/CountryFlag"
        description="A player's country as osu!'s flag. Tap, hover or focus a flag for its English name, worked out on the server. Inside a link that names the country, or beside the written name, the flag is decorative."
      >
        <div className="flex flex-col gap-4">
          <Examples>
            <Example label="Name on tap">
              <span className="flex flex-wrap items-center gap-3">
                {FLAG_CODES.map((code) => (
                  <CountryFlag key={code} code={code} />
                ))}
              </span>
            </Example>
            <Example label="Sizes" hint="sm 16×11, md 21×14">
              <span className="flex items-center gap-3">
                <CountryFlag code="NO" size="sm" />
                <CountryFlag code="NO" size="md" />
              </span>
            </Example>
            <Example label="In a row" hint="decorative: the link names it">
              <a
                href="#format-country-flag"
                aria-label="#12 in South Korea"
                className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-muted-foreground tabular-nums transition-colors hover:text-foreground"
              >
                <CountryFlag code="KR" decorative />
                <span aria-hidden="true">#12</span>
              </a>
            </Example>
          </Examples>
        </div>
      </Specimen>

      <Specimen
        id="format-country-name"
        name="CountryName"
        importPath="@/components/kit/country/CountryFlag"
        description="A flag and the country's English name, for a profile's country or a chosen filter value. Long names wrap unless truncate is set."
      >
        <Examples>
          <Example label="Profile">
            <CountryName code="AU" />
          </Example>
          <Example label="Small">
            <CountryName code="DE" size="sm" className="text-sm" />
          </Example>
          <Example label="Long name">
            <CountryName code="VC" className="max-w-40" />
          </Example>
          <Example label="Truncated">
            <CountryName code="VC" truncate className="max-w-40" />
          </Example>
        </Examples>
      </Specimen>

      <Specimen
        id="format-country-combobox"
        name="CountryCombobox"
        importPath="@/components/kit/country/CountryCombobox"
        description="A searchable country picker for filters. It searches names, ignoring case and accents, older names such as Turkey, and exact codes; the chosen country comes first, then the closest matches, and choosing it again clears it. The options come from the server (getCountryOptions), so names match everywhere."
      >
        <div className="flex flex-col gap-4">
          <CountryComboboxDemo countries={countryOptions} />
          <CountryComboboxDemo countries={countryOptions} initialValue="PL" />
        </div>
      </Specimen>

      <Specimen
        id="format-field-names"
        name="Field names"
        importPath="@/lib/kit/format/fields"
        description="One name per field, in sentence case. Each name here settles a different name the site once used for the same thing (its `legacy`, never rendered); the full glossary, Title Case variants included, is FIELD_NAMES."
      >
        <ul className="flex flex-col divide-y text-sm">
          {RETIRED_NAMES.map((entry) => (
            <li
              key={entry.label}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 first:pt-0 last:pb-0"
            >
              <span className="font-medium">
                {entry.label}
                {entry.short ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    short: {entry.short}
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">
                not {entry.replaces.join(', ')}
              </span>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen
        id="format-audit-change"
        name="AuditFieldChange"
        importPath="@/components/kit/format/AuditFieldChange"
        description="One changed field in an audit entry: a sentence-case label, the old value muted and struck through, and the new value, with mods, timestamps, enums and users written out."
      >
        <AuditChangeList>
          {AUDIT_CHANGES.map((change) => (
            <AuditFieldChange
              key={`${change.entityType}-${change.field}`}
              entityType={change.entityType}
              field={change.field}
              change={change}
              users={AUDIT_USERS}
            />
          ))}
        </AuditChangeList>
      </Specimen>
    </GallerySection>
  );
}

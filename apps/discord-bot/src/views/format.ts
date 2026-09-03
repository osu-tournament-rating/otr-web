import type { Ruleset, VerificationStatus } from '@otr/core/osu';

import {
  LobbySizeEnumHelper,
  RulesetEnumHelper,
  VerificationStatusEnumHelper,
} from '@/lib/enum-helpers';
import { getTierString, type TierName } from '@/lib/utils/tierData';

const numbers = new Intl.NumberFormat('en-US');
const regions = new Intl.DisplayNames(['en'], { type: 'region' });

export const num = (value: number) => numbers.format(Math.round(value));

export const signed = (value: number) => {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : '+'}${num(Math.abs(rounded))}`;
};

export const pct = (fraction: number, digits = 0) =>
  `${(fraction * 100).toFixed(digits)}%`;

/** Drops a trailing `.0` from a one-decimal setting such as CS 4. */
export const setting = (value: number) => String(Number(value.toFixed(1)));

export const rulesetName = (ruleset: Ruleset) =>
  RulesetEnumHelper.getMetadata(ruleset).text;

export const statusName = (status: VerificationStatus) =>
  VerificationStatusEnumHelper.getMetadata(status).text;

export const lobby = (size: number) => LobbySizeEnumHelper.toString(size);

export const rankRange = (lowerBound: number) =>
  lowerBound <= 1 ? 'Open rank' : `#${num(lowerBound)}+`;

export const tier = (progress: {
  currentTier: string;
  currentSubTier: number | null;
}) =>
  getTierString(
    progress.currentTier as TierName,
    progress.currentSubTier ?? undefined
  );

export const flag = (country: string) => {
  const code = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '';
  }
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)
  );
};

export const countryName = (country: string) => {
  try {
    return regions.of(country.toUpperCase()) ?? country;
  } catch {
    return country;
  }
};

export const bar = (fraction: number, cells = 10) => {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * cells);
  return '▰'.repeat(filled) + '▱'.repeat(cells - filled);
};

/** The UTC calendar day, as `2023-04-29`. */
export const date = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const agoUnits: [seconds: number, suffix: string][] = [
  [31_536_000, 'y'],
  [2_592_000, 'mo'],
  [86_400, 'd'],
  [3_600, 'h'],
  [60, 'm'],
];

/** The age of a time in its largest whole unit, as `3y ago`; `now` under a minute. */
export const ago = (iso: string, now = Date.now()) => {
  const seconds = Math.max(0, (now - Date.parse(iso)) / 1000);
  for (const [size, suffix] of agoUnits) {
    const value = Math.floor(seconds / size);
    if (value >= 1) {
      return `${value}${suffix} ago`;
    }
  }
  return 'now';
};

export type HourWindow = { start: number; end: number; share: number };

/**
 * The shortest run of whole UTC hours that covers `least` of `hours`, earliest
 * start on a tie; `end` is exclusive. Null under three hours.
 */
export const hourWindow = (hours: number[], least = 0.8): HourWindow | null => {
  if (hours.length < 3) {
    return null;
  }
  const counts = Array.from({ length: 24 }, () => 0);
  for (const hour of hours) {
    counts[((hour % 24) + 24) % 24] += 1;
  }
  const need = hours.length * least;

  for (let length = 1; length <= 24; length += 1) {
    for (let start = 0; start < 24; start += 1) {
      let covered = 0;
      for (let step = 0; step < length; step += 1) {
        covered += counts[(start + step) % 24];
      }
      if (covered >= need) {
        return {
          start,
          end: length === 24 ? 24 : (start + length) % 24,
          share: covered / hours.length,
        };
      }
    }
  }
  return null;
};

/** The rating a player gained or lost across one tournament. */
export const tournamentDelta = (
  adjustments: {
    ratingDelta: number;
    match: { tournamentId: number | null } | null;
  }[],
  tournamentId: number
) =>
  adjustments.reduce(
    (sum, adjustment) =>
      adjustment.match?.tournamentId === tournamentId
        ? sum + adjustment.ratingDelta
        : sum,
    0
  );

/** A Discord timestamp: R relative, D long date, d short date. */
export const when = (iso: string, style: 'R' | 'D' | 'd') =>
  `<t:${Math.floor(new Date(iso).getTime() / 1000)}:${style}>`;

export const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export const link = (text: string, url: string) => `[${text}](${url})`;

export const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** A code block with padded columns; `right` marks the columns that align right. */
export const table = (rows: string[][], right: boolean[] = []) => {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((cells) => cells[column].length))
  );
  const lines = rows.map((cells) =>
    cells
      .map((cell, column) =>
        right[column]
          ? cell.padStart(widths[column])
          : cell.padEnd(widths[column])
      )
      .join('  ')
      .trimEnd()
  );
  return `\`\`\`\n${lines.join('\n')}\n\`\`\``;
};

/** A code block of `label pct count bar` rows; the bar scales to the top row. */
export const histogram = (
  rows: { label: string; count: number; share: number }[],
  cells = 7
) => {
  const top = Math.max(...rows.map((row) => row.count));
  return table(
    rows.map((row) => [
      row.label,
      pct(row.share),
      num(row.count),
      bar(row.count / top, cells),
    ]),
    [false, true, true, false]
  );
};

export const plural = (
  count: number,
  singular: string,
  pluralForm = `${singular}s`
) => (count === 1 ? singular : pluralForm);

export const inProgress = 'Stats are still in progress. Check back later.';

export const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/** `Artist - Title [Diff]` from the overrides or the set; `Beatmap <osuId>` when neither exists. */
export const mapTitle = (b: {
  osuId: number;
  diffName: string;
  artistOverride: string | null;
  titleOverride: string | null;
  beatmapset?: { artist: string; title: string } | null;
}) => {
  const artist = b.artistOverride ?? b.beatmapset?.artist;
  const title = b.titleOverride ?? b.beatmapset?.title;
  const name =
    artist && title
      ? `${artist} - ${title}`
      : (title ?? artist ?? `Beatmap ${b.osuId}`);
  return b.diffName ? `${name} [${b.diffName}]` : name;
};

export const paginate = <T>(items: T[], page: number, size: number) => {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return {
    pages,
    page: current,
    items: items.slice((current - 1) * size, current * size),
  };
};

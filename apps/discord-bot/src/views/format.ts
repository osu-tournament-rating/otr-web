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

export const signed = (value: number) =>
  `${value < 0 ? '-' : '+'}${num(Math.abs(value))}`;

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

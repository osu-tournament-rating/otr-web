/**
 * One formatter per kind of number, fixed to en-US so the server and the
 * browser agree (issue #1017). Counts, ranks and ratings get thousands
 * separators; years and IDs are labels and never do.
 */

import { EMPTY_VALUE } from './empty';

type Empty = { empty?: string };

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(
  minimumFractionDigits: number,
  maximumFractionDigits: number
): Intl.NumberFormat {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Rounds half away from zero and turns `-0` into `0`, so nothing prints `-0`. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded =
    (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
  return rounded === 0 ? 0 : rounded;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * A quantity with thousands separators: `1,234.5`. `decimals` fixes the
 * number of decimals; `maxDecimals` allows up to that many and drops
 * trailing zeros (`174.5`, `180`).
 */
export function formatNumber(
  value: number | null | undefined,
  {
    decimals,
    maxDecimals,
    empty = EMPTY_VALUE,
  }: { decimals?: number; maxDecimals?: number } & Empty = {}
): string {
  if (!isNumber(value)) return empty;

  const max = decimals ?? maxDecimals ?? 0;
  const min = decimals ?? 0;
  return numberFormat(min, max).format(round(value, max));
}

/** How many of something: `12,345`. Always whole, always separated. */
export function formatCount(
  value: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return formatNumber(value, { decimals: 0, empty });
}

/**
 * `1 match`, `1,204 matches`. Pass `plural` when adding an "s" is wrong
 * (`formatCountOf(2, 'match', 'matches')`).
 */
export function formatCountOf(
  value: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${formatCount(value)} ${round(value, 0) === 1 ? singular : plural}`;
}

/** A leaderboard position: `#1,234`, everywhere. */
export function formatRank(
  value: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return isNumber(value) ? `#${formatCount(value)}` : empty;
}

/** A rating as players read it: whole, with separators (`1,235`). */
export function formatRating(
  value: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return formatNumber(value, { decimals: 0, empty });
}

/** A rating to two decimals (`1,234.57`), for tooltips and exports. */
export function formatRatingPrecise(
  value: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return formatNumber(value, { decimals: 2, empty });
}

/** Rating changes always show one decimal. */
export const RATING_DELTA_DECIMALS = 1;

/** U+2212, as wide as `+` in tabular figures. A hyphen looks shorter. */
export const MINUS_SIGN = String.fromCharCode(0x2212);

export type DeltaDirection = 'up' | 'down' | 'flat';

/** Up, down or flat, judged after rounding to one decimal, so `0.04` is flat. */
export function getDeltaDirection(value: number): DeltaDirection {
  const rounded = round(value, RATING_DELTA_DECIMALS);
  if (rounded > 0) return 'up';
  if (rounded < 0) return 'down';
  return 'flat';
}

/**
 * A signed rating change to one decimal: `+12.3`, `−4.5` (with
 * {@link MINUS_SIGN}), `0.0`.
 */
export function formatRatingDelta(value: number): string {
  const rounded = round(value, RATING_DELTA_DECIMALS);
  const magnitude = numberFormat(
    RATING_DELTA_DECIMALS,
    RATING_DELTA_DECIMALS
  ).format(Math.abs(rounded));

  if (rounded > 0) return `+${magnitude}`;
  if (rounded < 0) return `${MINUS_SIGN}${magnitude}`;
  return magnitude;
}

/** `1st`, `22nd`, `113th`, `1,001st`. */
export function formatOrdinal(value: number): string {
  const whole = round(value, 0);
  const lastTwo = Math.abs(whole) % 100;
  const last = Math.abs(whole) % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? 'th'
      : last === 1
        ? 'st'
        : last === 2
          ? 'nd'
          : last === 3
            ? 'rd'
            : 'th';

  return `${formatCount(whole)}${suffix}`;
}

/**
 * The one percentile style: a whole ordinal, `97th percentile`. Takes 0–100,
 * rounds down so it never overstates, and stays within 1st–99th. Pass
 * `short` for a tile already labelled "Percentile" (`97th`).
 */
export function formatPercentile(
  value: number | null | undefined,
  { short = false, empty = EMPTY_VALUE }: { short?: boolean } & Empty = {}
): string {
  if (!isNumber(value)) return empty;

  const ordinal = formatOrdinal(Math.min(99, Math.max(1, Math.floor(value))));
  return short ? ordinal : `${ordinal} percentile`;
}

/** A share given as a fraction (0–1): `54.2%`. */
export function formatPercent(
  fraction: number | null | undefined,
  { decimals = 1, empty = EMPTY_VALUE }: { decimals?: number } & Empty = {}
): string {
  if (!isNumber(fraction)) return empty;
  return `${formatNumber(fraction * 100, { decimals })}%`;
}

/** Score accuracy, stored as a fraction (0–1): `98.54%`, as osu! shows it. */
export function formatAccuracy(
  fraction: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return formatPercent(fraction, { decimals: 2, empty });
}

/** An ID is a label: digits only, no separators (`12345678`). */
export function formatId(
  value: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return isNumber(value) ? String(Math.trunc(value)) : empty;
}

/** A year is a label: `2024`, never `2,024`. */
export function formatYear(
  value: number | null | undefined,
  { empty = EMPTY_VALUE }: Empty = {}
): string {
  return isNumber(value) ? String(Math.trunc(value)) : empty;
}

/**
 * Axis and tooltip number formats for charts, shaped for Recharts'
 * `tickFormatter`. Counts and quantities get thousands separators; years and
 * IDs are labels and never do. The plain kinds come from the format family's
 * formatters, so a chart and the table beside it print the same text. All
 * fixed to en-US and UTC, so server and client agree.
 */
import {
  formatCount,
  formatId,
  formatNumber,
  formatYear,
} from '@/lib/kit/format/number';

import type { TimeTickUnit } from './ticks';

/** A count: `12,345`. Rounds to a whole number. */
export function formatCountTick(value: number): string {
  return formatCount(value);
}

/** A quantity such as a rating: `1,250`, `0.25`. Up to two decimals. */
export function formatNumberTick(value: number): string {
  return formatNumber(value, { maxDecimals: 2 });
}

/** A large quantity, shortened: `950`, `250k`, `1.25M`. */
export function formatCompactTick(value: number): string {
  const magnitude = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (magnitude >= 1_000_000) {
    return `${sign}${Number((magnitude / 1_000_000).toFixed(2))}M`;
  }
  if (magnitude >= 1_000) {
    const thousands = Math.round(magnitude / 1_000);
    return thousands >= 1_000 ? `${sign}1M` : `${sign}${thousands}k`;
  }
  return formatCountTick(value);
}

/** A value already in percent: `95%`, `97.5%`. */
export function formatPercentTick(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/** A year: `2024`, never `2,024`. */
export function formatYearTick(value: number | string): string {
  return formatYear(Number(value));
}

/** An ID: `1234567`, never `1,234,567`. */
export function formatIdTick(value: number | string): string {
  return formatId(Number(value));
}

const DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const MONTH = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * A time tick in UTC, shaped by what the ticks fall on: `Jul 20`,
 * `Jul 2024`, `2024`. Pass the `unit` from `getTimeTicks`.
 */
export function formatTimeTick(timestamp: number, unit: TimeTickUnit): string {
  if (unit === 'year') return String(new Date(timestamp).getUTCFullYear());
  return (unit === 'month' ? MONTH : DAY).format(timestamp);
}

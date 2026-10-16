/**
 * Labels for active-filter chips, so every list words them the same way:
 * `SR: 5 – 7`, `Rank restriction: at least 1,000`,
 * `Status: Pending, Verified +1`, `Dates: Jul 20 – Aug 3, 2024`.
 */

import { RANGE_SEPARATOR, formatDateRange } from '@/lib/kit/format/date';
import { formatNumber } from '@/lib/kit/format/number';

import type { DayRange, NumberRange } from './params';

/** Up to two decimals, with thousands separators: `1,000`, `5.25`. */
export function formatFilterNumber(value: number): string {
  return formatNumber(value, { maxDecimals: 2 });
}

/** `SR: 5 – 7`, `SR: at least 5`, `SR: at most 7`; empty when the range is open. */
export function formatRangeFilterLabel(
  label: string,
  range: NumberRange,
  format: (value: number) => string = formatFilterNumber
): string {
  const { min, max } = range;
  if (min !== undefined && max !== undefined) {
    return `${label}: ${format(min)}${RANGE_SEPARATOR}${format(max)}`;
  }
  if (min !== undefined) return `${label}: at least ${format(min)}`;
  if (max !== undefined) return `${label}: at most ${format(max)}`;
  return '';
}

/**
 * `Status: Pending, Verified`; past `max` names, the rest become a count:
 * `Status: Pending, Pre-verified +2`. Empty when nothing is selected.
 */
export function formatChoiceFilterLabel(
  label: string,
  selected: readonly string[],
  max = 2
): string {
  if (selected.length === 0) return '';
  const shown = selected.slice(0, max).join(', ');
  const rest = selected.length - max;
  return rest > 0 ? `${label}: ${shown} +${rest}` : `${label}: ${shown}`;
}

/** `Dates: Jul 20 – Aug 3, 2024`, `Dates: from Jul 20, 2024`; empty when open. */
export function formatDayRangeFilterLabel(
  label: string,
  range: DayRange
): string {
  if (!range.from && !range.to) return '';
  const text = formatDateRange(range.from, range.to);
  // "From …" and "Until …" read as a sentence after the colon.
  const sentence = range.from && range.to ? text : lowerFirst(text);
  return `${label}: ${sentence}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

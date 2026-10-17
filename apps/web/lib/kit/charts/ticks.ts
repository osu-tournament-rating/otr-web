/**
 * The site's one tick rule: steps of 1, 2, 2.5 or 5 times a power of ten
 * (the beatmap pages' steps), as many ticks as fit, never more than six.
 */
const STEP_MANTISSAS = [1, 2, 2.5, 5] as const;

export const DEFAULT_MAX_TICKS = 6;

/** The limit below the `sm` breakpoint (`useIsNarrowChart`), where labels would collide. */
export const NARROW_MAX_TICKS = 4;

export interface NiceTicks {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

export interface NiceTickOptions {
  /** At most this many ticks, edges included. Defaults to 6. */
  maxTicks?: number;
  /** Whole-number steps only, for counts. */
  integer?: boolean;
  /**
   * Keep the domain on the data and put ticks only inside it, for axes whose
   * ends the data fixes: categories, histogram buckets, `dataMin`–`dataMax`.
   */
  within?: boolean;
}

function trimFloatDrift(value: number): number {
  return Number(value.toPrecision(12));
}

/**
 * Round ticks covering `minValue`..`maxValue`. The densest step that fits
 * `maxTicks` wins. Data that never goes below zero never gets a negative
 * tick; a bar chart passes 0 as `minValue` so its bars start at zero.
 */
export function getNiceTicks(
  minValue: number,
  maxValue: number,
  {
    maxTicks = DEFAULT_MAX_TICKS,
    integer = false,
    within = false,
  }: NiceTickOptions = {}
): NiceTicks {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { min: 0, max: 1, step: 1, ticks: [0, 1] };
  }

  const low = Math.min(minValue, maxValue);
  const high = Math.max(minValue, maxValue);

  if (high === low) {
    // A flat series still needs an axis: pad by a tenth of its magnitude.
    const pad =
      high === 0 ? 1 : 10 ** (Math.floor(Math.log10(Math.abs(high))) - 1);
    const padded = integer ? Math.max(1, pad) : pad;
    const paddedLow = low >= 0 ? Math.max(0, low - padded) : low - padded;

    // Inside the data there is one value to label, and only that one: a
    // padded tick (2023 beside the one year 2024) names nothing in the data.
    // The domain keeps its padding so a numeric axis does not collapse.
    if (within) {
      return {
        min: trimFloatDrift(paddedLow),
        max: trimFloatDrift(high + padded),
        step: trimFloatDrift(padded),
        ticks: [low],
      };
    }

    return getNiceTicks(paddedLow, high + padded, { maxTicks, integer });
  }

  const exponent = Math.floor(Math.log10(high - low));
  const limit = Math.max(2, maxTicks);
  let best: NiceTicks | null = null;

  for (let scale = exponent - 1; scale <= exponent + 1; scale++) {
    for (const mantissa of STEP_MANTISSAS) {
      const step = trimFloatDrift(mantissa * 10 ** scale);
      if (integer && !Number.isInteger(step)) continue;

      const rawMin = Math.floor(low / step) * step;
      const min = low >= 0 ? Math.max(0, rawMin) : rawMin;
      const max = Math.ceil(high / step) * step;
      // Inside the data, the first and last multiples of the step.
      const first = within ? Math.ceil(low / step) * step : min;
      const last = within ? Math.floor(high / step) * step : max;
      const count = Math.round((last - first) / step) + 1;

      if (count < 2 || count > limit) continue;
      if (best === null || count > best.ticks.length) {
        best = {
          min: within ? low : trimFloatDrift(min),
          max: within ? high : trimFloatDrift(max),
          step,
          // Recomputed from the floor rather than accumulated, to keep float dust off labels.
          ticks: Array.from({ length: count }, (_, index) =>
            trimFloatDrift(first + index * step)
          ),
        };
      }
    }
  }

  if (best !== null) return best;

  // Only reachable when no step fits, such as an integer span under one
  // step or a range too narrow for two ticks inside it: label the ends.
  if (within)
    return { min: low, max: high, step: high - low, ticks: [low, high] };

  const min = Math.floor(low);
  const max = Math.max(min + 1, Math.ceil(high));
  return { min, max, step: max - min, ticks: [min, max] };
}

/**
 * Ticks for a category axis of evenly spaced whole numbers, such as years or
 * rating bucket starts, given in ascending order: every value when they all
 * fit, otherwise the tick rule's round values that are in the data, so every
 * tick names a bar.
 */
export function getCategoryTicks(
  values: readonly number[],
  maxTicks = DEFAULT_MAX_TICKS
): number[] {
  if (values.length <= maxTicks) return [...values];

  const present = new Set(values);
  return getNiceTicks(values[0], values[values.length - 1], {
    integer: true,
    within: true,
    maxTicks,
  }).ticks.filter((tick) => present.has(tick));
}

const DAY_MS = 86_400_000;
const DAY_STEPS = [1, 2, 7, 14] as const;
const MONTH_STEPS = [1, 2, 3, 6, 12, 24, 60, 120] as const;

export type TimeTickUnit = 'day' | 'month' | 'year';

export interface TimeTicks {
  ticks: number[];
  /** What the ticks fall on, which picks the label format. */
  unit: TimeTickUnit;
}

function monthIndex(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function monthStart(index: number): number {
  return Date.UTC(Math.floor(index / 12), index % 12, 1);
}

/**
 * Ticks for a time axis on calendar boundaries in UTC: days, then whole
 * months (1, 2, 3 or 6, starting in January), then years. The finest
 * spacing with two to `maxTicks` ticks inside the range wins.
 */
export function getTimeTicks(
  minTime: number,
  maxTime: number,
  maxTicks = DEFAULT_MAX_TICKS
): TimeTicks {
  const low = Math.min(minTime, maxTime);
  const high = Math.max(minTime, maxTime);

  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return { ticks: [], unit: 'day' };
  }

  for (const step of DAY_STEPS) {
    const first = Math.ceil(low / DAY_MS / step) * step;
    const last = Math.floor(high / DAY_MS / step) * step;
    const count = (last - first) / step + 1;

    if (count >= 2 && count <= maxTicks) {
      return {
        unit: 'day',
        ticks: Array.from(
          { length: count },
          (_, index) => (first + index * step) * DAY_MS
        ),
      };
    }
  }

  for (const step of MONTH_STEPS) {
    const lowIndex = monthIndex(low);
    let first = Math.ceil(lowIndex / step) * step;
    if (monthStart(first) < low) first += step;
    const last = Math.floor(monthIndex(high) / step) * step;
    const count = Math.floor((last - first) / step) + 1;

    if (count >= 2 && count <= maxTicks) {
      return {
        unit: step >= 12 ? 'year' : 'month',
        ticks: Array.from({ length: count }, (_, index) =>
          monthStart(first + index * step)
        ),
      };
    }
  }

  // A range too short for two day boundaries: label its ends.
  return { unit: 'day', ticks: low === high ? [low] : [low, high] };
}

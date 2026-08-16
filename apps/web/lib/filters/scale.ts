// Radix sliders work in one numeric space, so every filter drives a fixed
// 0..100 track and converts to domain values through a `NumericScale`.

export const SLIDER_MIN = 0;
export const SLIDER_MAX = 100;
export const SLIDER_STEP = 0.0001;

export interface NumericScale {
  readonly min: number;
  readonly max: number;
  /** Nearest legal value, clamped to the scale bounds. */
  snap(value: number): number;
  /** Domain value -> 0..100 track position. */
  toPosition(value: number): number;
  /** 0..100 track position -> snapped domain value. */
  fromPosition(position: number): number;
  /** Keyboard movement: `stops` legal steps away from `value`. */
  step(value: number, stops: number): number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Decimal places in `step`, for undoing float error after multiplying back up. */
function decimalPlaces(step: number): number {
  const [mantissa, exponent] = String(Math.abs(step)).toLowerCase().split('e');
  const dot = mantissa.indexOf('.');
  const fraction = dot === -1 ? 0 : mantissa.length - dot - 1;
  const shift = exponent ? Number(exponent) : 0;

  return clamp(fraction - shift, 0, 20);
}

export function linearScale(options: {
  min: number;
  max: number;
  step?: number;
}): NumericScale {
  const { min, max } = options;
  const step = options.step && options.step > 0 ? options.step : 1;
  const places = decimalPlaces(step);
  const span = max - min;

  const round = (value: number) => Number(value.toFixed(places));
  const snap = (value: number) => {
    if (!Number.isFinite(value)) return min;
    return clamp(round(Math.round(value / step) * step), min, max);
  };

  return {
    min,
    max,
    snap,
    toPosition(value) {
      if (!Number.isFinite(value) || span <= 0) return SLIDER_MIN;
      return ((clamp(value, min, max) - min) / span) * SLIDER_MAX;
    },
    fromPosition(position) {
      if (!Number.isFinite(position)) return min;
      const ratio = clamp(position, SLIDER_MIN, SLIDER_MAX) / SLIDER_MAX;
      return snap(min + ratio * span);
    },
    step(value, stops) {
      const from = snap(value);
      if (stops === 0) return from;
      return snap(round(from + stops * step));
    },
  };
}

/**
 * A scale over contiguous tiers of differing step sizes. Position maps by stop
 * index, so a tier's track space follows its stop count, not its numeric width.
 */
export function tieredScale(options: {
  tiers: readonly { start: number; end: number; step: number }[];
}): NumericScale {
  const stops = Array.from(
    new Set(
      options.tiers.flatMap(({ start, end, step }) =>
        Array.from(
          { length: Math.floor((end - start) / step) + 1 },
          (_, index) => start + index * step
        )
      )
    )
  ).sort((a, b) => a - b);

  const lastIndex = stops.length - 1;
  const min = stops[0];
  const max = stops[lastIndex];

  /** First index whose stop is >= target. */
  const lowerBound = (target: number) => {
    let low = 0;
    let high = stops.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (stops[middle] < target) low = middle + 1;
      else high = middle;
    }
    return low;
  };

  /** First index whose stop is > target. */
  const upperBound = (target: number) => {
    let low = 0;
    let high = stops.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (stops[middle] <= target) low = middle + 1;
      else high = middle;
    }
    return low;
  };

  const nearestIndex = (value: number) => {
    const target = clamp(Number.isFinite(value) ? value : min, min, max);
    const upper = clamp(lowerBound(target), 0, lastIndex);
    const lower = clamp(upper - 1, 0, lastIndex);
    // Ties resolve upward.
    return target - stops[lower] < stops[upper] - target ? lower : upper;
  };

  return {
    min,
    max,
    snap: (value) => stops[nearestIndex(value)],
    toPosition(value) {
      if (lastIndex <= 0) return SLIDER_MIN;
      return (nearestIndex(value) / lastIndex) * SLIDER_MAX;
    },
    fromPosition(position) {
      if (!Number.isFinite(position)) return min;
      const ratio = clamp(position, SLIDER_MIN, SLIDER_MAX) / SLIDER_MAX;
      return stops[clamp(Math.round(ratio * lastIndex), 0, lastIndex)];
    },
    step(value, stops_) {
      if (stops_ === 0) return stops[nearestIndex(value)];
      const target =
        stops_ > 0
          ? upperBound(value) + stops_ - 1
          : lowerBound(value) + stops_;
      return stops[clamp(target, 0, lastIndex)];
    },
  };
}

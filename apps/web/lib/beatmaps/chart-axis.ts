const AXIS_STEP_MANTISSAS = [1, 2, 2.5, 5] as const;

export interface NiceAxis {
  min: number;
  max: number;
  ticks: number[];
}

/**
 * A labelled axis over `minValue`..`maxValue` with the densest round tick
 * spacing that fits `maxTicks`. Never floors below zero.
 */
export function getNiceAxis(
  minValue: number,
  maxValue: number,
  maxTicks = 6
): NiceAxis {
  const span = maxValue - minValue;

  if (!Number.isFinite(span) || span <= 0) {
    const value = Number.isFinite(maxValue) ? Math.max(0, maxValue) : 0;
    return { min: value, max: value, ticks: [value] };
  }

  const exponent = Math.floor(Math.log10(span));
  let best: { min: number; max: number; step: number; count: number } | null =
    null;

  for (let scale = exponent - 1; scale <= exponent + 1; scale++) {
    for (const mantissa of AXIS_STEP_MANTISSAS) {
      const step = mantissa * 10 ** scale;
      if (!Number.isFinite(step) || step <= 0) continue;

      const min = Math.max(0, Math.floor(minValue / step) * step);
      const max = Math.ceil(maxValue / step) * step;
      const count = Math.round((max - min) / step) + 1;

      if (count < 2 || count > maxTicks) continue;
      if (best === null || count > best.count) best = { min, max, step, count };
    }
  }

  if (best === null) {
    return { min: minValue, max: maxValue, ticks: [minValue, maxValue] };
  }

  const { min, max, step, count } = best;

  return {
    min: trimFloatDrift(min),
    max: trimFloatDrift(max),
    // Recomputed from the floor rather than accumulated, to keep float dust off labels.
    ticks: Array.from({ length: count }, (_, index) =>
      trimFloatDrift(min + index * step)
    ),
  };
}

function trimFloatDrift(value: number): number {
  return Number(value.toPrecision(12));
}

/** Pulls an axis ceiling back down onto the data, keeping the ticks inside it. */
export function fitAxisMax(axis: NiceAxis, maxValue: number): NiceAxis {
  if (
    !Number.isFinite(maxValue) ||
    maxValue >= axis.max ||
    maxValue <= axis.min
  ) {
    return axis;
  }

  return {
    min: axis.min,
    max: trimFloatDrift(maxValue),
    ticks: axis.ticks.filter((tick) => tick <= maxValue),
  };
}

export interface ScatterAxis extends NiceAxis {
  /** Values below this are pinned onto it by the caller. Always equal to `min`. */
  floor: number;
}

/** A scatter axis floored on a low quantile, so one quit run cannot set the scale. */
export function getScatterAxis(
  values: readonly number[],
  quantile = 0.01,
  maxTicks = 6
): ScatterAxis | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];

  // d3's interpolated quantile.
  const rank = quantile * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const floor =
    sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);

  const axis = getNiceAxis(
    // A quantile at the top of the sample would clamp away the whole distribution.
    floor >= max ? sorted[0] : floor,
    max,
    maxTicks
  );

  return { ...axis, floor: axis.min };
}

/** Axis label for a score: `0`, `250k`, `1.25M`. */
export function formatScoreTick(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) {
    const thousands = Math.round(value / 1_000);
    return thousands >= 1_000 ? '1M' : `${thousands}k`;
  }
  return `${Math.round(value)}`;
}

/** Axis label for an accuracy percentage: `95%`, `97.5%`. */
export function formatAccuracyTick(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/** Positions a value on the shared min..max domain as a CSS percentage. */
export function toAxisPercent(value: number, min: number, max: number): number {
  if (max <= min) return 50;

  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export interface ScaleTick {
  value: number;
  label: string;
  /** Position along the track, 0..100. */
  percent: number;
}

/**
 * The labelled ticks under a row chart, plus the interior gridline positions.
 * Edge ticks are dropped by position, not by index — `fitAxisMax` can leave the
 * topmost tick short of the right edge.
 */
export function getScaleTicks(
  axis: NiceAxis,
  format: (value: number) => string
): { ticks: ScaleTick[]; gridPercents: number[] } {
  const ticks = axis.ticks.map((value) => ({
    value,
    label: format(value),
    percent: toAxisPercent(value, axis.min, axis.max),
  }));

  return {
    ticks,
    gridPercents:
      ticks.length < 2
        ? []
        : ticks
            .filter((tick) => tick.percent > 0 && tick.percent < 100)
            .map((tick) => tick.percent),
  };
}

export interface BoxPlotQuartiles {
  min: number;
  /** Never drawn; the lowest point the shared axis may truncate at. */
  p20: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
}

export interface BoxPlotMarks {
  /** Every position is a percentage along the track, 0..100. */
  minPercent: number;
  p25Percent: number;
  medianPercent: number;
  p75Percent: number;
  maxPercent: number;
  /** The low whisker was cut off by the axis rather than ending where it is drawn. */
  minClamped: boolean;
}

/**
 * The shared axis for a set of box plot rows: lowest p20 to highest maximum, or
 * lowest minimum when `expanded`. p20 rather than p25 because `getNiceAxis` only
 * rounds a floor down, keeping `axis.min <= p20` of every row.
 */
export function getBoxPlotAxis(
  groups: readonly BoxPlotQuartiles[],
  maxTicks = 6,
  expanded = false
): NiceAxis {
  if (groups.length === 0) return getNiceAxis(0, 0, maxTicks);

  const max = Math.max(...groups.map((group) => group.max));

  return fitAxisMax(
    getNiceAxis(
      Math.min(...groups.map((group) => (expanded ? group.min : group.p20))),
      max,
      maxTicks
    ),
    max
  );
}

export interface BoxPlotView {
  axis: NiceAxis;
  ticks: ScaleTick[];
  gridPercents: number[];
  /** At least one whisker is cut off, so the chart can offer to zoom out. */
  canExpand: boolean;
}

/** The axis for the current zoom, its ticks, and whether zooming out is on offer. */
export function getBoxPlotView(
  groups: readonly BoxPlotQuartiles[],
  format: (value: number) => string,
  maxTicks = 6,
  expanded = false
): BoxPlotView {
  const truncated = getBoxPlotAxis(groups, maxTicks);
  const canExpand = groups.some((group) => group.min < truncated.min);
  const axis =
    expanded && canExpand ? getBoxPlotAxis(groups, maxTicks, true) : truncated;

  return { axis, canExpand, ...getScaleTicks(axis, format) };
}

/** Places one group's quartiles on `axis`, flagging a whisker it cuts off. */
export function toBoxPlotMarks(
  quartiles: BoxPlotQuartiles,
  axis: NiceAxis
): BoxPlotMarks {
  const place = (value: number) => toAxisPercent(value, axis.min, axis.max);

  return {
    minPercent: place(quartiles.min),
    p25Percent: place(quartiles.p25),
    medianPercent: place(quartiles.median),
    p75Percent: place(quartiles.p75),
    maxPercent: place(quartiles.max),
    minClamped: quartiles.min < axis.min,
  };
}

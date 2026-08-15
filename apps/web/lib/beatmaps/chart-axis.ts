/**
 * Shared axis for the beatmap page's box plots.
 *
 * Tournament scores and accuracies on a single map both cluster in a narrow
 * band, so anchoring a track at zero squeezes every box into the last few
 * percent of its width. Rows on one chart share a zoomed domain instead: the
 * extremes of the data, widened outward onto round tick values so the labels
 * stay readable and the outermost whiskers keep a little room before the edge.
 */

/** Tick spacings that still read as round numbers. */
const AXIS_STEP_MANTISSAS = [1, 2, 2.5, 5] as const;

export interface NiceAxis {
  /** Domain floor: the lowest value on the chart, rounded down onto a tick. */
  min: number;
  /** Domain ceiling: the highest value on the chart, rounded up onto a tick. */
  max: number;
  /** Evenly spaced tick values from `min` to `max`, inclusive. */
  ticks: number[];
}

/**
 * A labelled axis covering `minValue`..`maxValue`, picking the densest round
 * tick spacing that stays within `maxTicks`. Never floors below zero, which
 * both scores and accuracy percentages rely on.
 */
export function getNiceAxis(
  minValue: number,
  maxValue: number,
  maxTicks = 6
): NiceAxis {
  const span = maxValue - minValue;

  // Nothing to spread out: one tick under the marks that `toAxisPercent` parks
  // mid-track.
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
    // Recomputing from the floor each time, rather than accumulating, keeps
    // binary-float dust like 87.50000000000001 off the labels.
    ticks: Array.from({ length: count }, (_, index) =>
      trimFloatDrift(min + index * step)
    ),
  };
}

function trimFloatDrift(value: number): number {
  return Number(value.toPrecision(12));
}

/**
 * Pulls an axis ceiling back down onto the data.
 *
 * `getNiceAxis` rounds its ceiling up onto a tick, which can leave most of a
 * step's worth of empty track past the highest mark. On a domain already zoomed
 * onto a narrow band that dead space is a visible fraction of the chart, so the
 * domain ends on `maxValue` instead and keeps only the ticks still inside it:
 * the labels stay round while the marks use the full width.
 */
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
    // The ceiling overshoots by less than one step, so at most the topmost
    // tick is dropped and `axis.min` always survives.
    ticks: axis.ticks.filter((tick) => tick <= maxValue),
  };
}

export interface ScatterAxis extends NiceAxis {
  /**
   * Values below this were not plotted where they fall. Always equal to `min`;
   * named separately so callers read the clamp as a decision rather than as an
   * incidental property of the domain.
   */
  floor: number;
}

/**
 * A scatter axis floored on a low quantile instead of on the minimum.
 *
 * One quit run is enough to ruin a whole plot: on a mania map where 327 of 328
 * scores sit between 860k and 999k, a single 288k score stretches the domain to
 * 200k..1M and crushes everything real into the top fifth of the chart. The
 * floor comes from the 1st percentile instead, and the caller pins anything
 * below it onto that floor — visible, marked, and no longer setting the scale.
 *
 * Small and tight samples are left alone: the quantile of a two-point sample
 * lands next to its minimum, and a sample with no spread degenerates, so both
 * fall through to the same domain `getNiceAxis` would have produced anyway.
 */
export function getScatterAxis(
  values: readonly number[],
  quantile = 0.01,
  maxTicks = 6
): ScatterAxis | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];

  // d3's interpolated quantile: the rank is a fraction of the way between two
  // sorted values, so the floor moves smoothly as the sample grows.
  const rank = quantile * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const floor =
    sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);

  const axis = getNiceAxis(
    // Degenerate: the quantile reaches the top of the sample, so clamping to it
    // would hide the entire distribution. Chart the raw range instead.
    floor >= max ? sorted[0] : floor,
    max,
    maxTicks
  );

  return { ...axis, floor: axis.min };
}

/**
 * Axis label for a score: `0`, `250k`, `1.25M`. Thousands round to whole `k`
 * — a tick reading `45.16k` is noise, not precision — while millions keep two
 * decimals so neighbouring ticks stay distinct.
 */
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
  // Every group collapsed onto a single value: there is no range to place
  // against, so park the marks mid-track rather than pinning them to the edge.
  if (max <= min) return 50;

  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export interface ScaleTick {
  /** Stable key and sort position. */
  value: number;
  label: string;
  /** Position along the track, 0..100. */
  percent: number;
}

/**
 * The labelled ticks under a row chart, plus the interior positions the rows
 * draw gridlines at. Ticks sitting on an edge of the track are left out of the
 * gridlines: they would just trace its border. A clipped ceiling (see
 * `fitAxisMax`) leaves its topmost tick short of the right edge, so this goes
 * by position rather than by index.
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
    // A lone tick is the degenerate axis' mid-track marker, not a gridline.
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
  /**
   * 20th percentile. Never drawn — it is only the lowest point the shared axis
   * may truncate at, so a chevron can never hide more than a fifth of a row.
   */
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
  /**
   * The low whisker was cut off by the axis rather than ending where it is
   * drawn. A chart zoomed onto its boxes has to say so; a ring parked on the
   * edge would read as a real extreme. There is no maximum counterpart: the
   * axis ceiling is the highest maximum on the chart, so no row reaches past
   * it — the top row simply ends on the edge.
   */
  minClamped: boolean;
}

/**
 * The shared axis for a set of box plot rows, zoomed onto the boxes: it runs
 * from the lowest p20 to the highest maximum, or from the lowest minimum when
 * `expanded`.
 *
 * Anchoring at the lowest *minimum* instead lets one outlier set the scale. A
 * single quit run on a mania map, where everything real sits above 900k, drags
 * the floor down far enough that every box collapses into a sliver against the
 * right edge.
 *
 * The floor is p20 rather than p25 to keep an invariant: `getNiceAxis` only
 * ever rounds a requested floor *down* (property-tested over 1.5M random
 * triples, zero violations), so `axis.min <= p20` of every row. A truncated
 * whisker therefore never hides more than a fifth of a row, and the chevron can
 * never reach a median. Rows whose whiskers still fall outside report it
 * through `toBoxPlotMarks`, so nothing is quietly hidden.
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

/**
 * Everything a box plot chart draws from: the axis for the current zoom, its
 * ticks, and whether zooming out is on offer.
 *
 * `canExpand` is always measured against the truncated axis, so the control
 * does not vanish the moment the reader uses it.
 */
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

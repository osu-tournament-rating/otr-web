/**
 * Shared score axis for the beatmap page's box plots.
 *
 * Tournament scores on a single map cluster in a narrow band near the top, so
 * anchoring the track at zero squeezes every box into the last few percent of
 * its width. These rows share a floor instead: the lowest value on the chart,
 * rounded down to a round number so the axis label stays readable and the
 * leftmost whisker keeps a little room before the edge.
 *
 * The accuracy rows on the tier card zoom their domain for the same reason.
 */

/** Granularity the shared floor is rounded down to. */
export const SCORE_FLOOR_STEP = 50_000;

/**
 * The floor every row on one chart is measured from. `minScores` is each
 * group's own minimum; an empty chart falls back to zero.
 */
export function getScoreFloor(minScores: readonly number[]): number {
  if (minScores.length === 0) return 0;

  const lowest = Math.min(...minScores);
  if (!Number.isFinite(lowest)) return 0;

  return Math.max(0, Math.floor(lowest / SCORE_FLOOR_STEP) * SCORE_FLOOR_STEP);
}

/** Positions a score on the shared floor..max scale as a CSS percentage. */
export function toScorePercent(
  value: number,
  floorScore: number,
  maxScore: number
): number {
  // Every group collapsed onto a single score: there is no range to place
  // against, so park the marks mid-track rather than pinning them to the edge.
  if (maxScore <= floorScore) return 50;

  return Math.min(
    100,
    Math.max(0, ((value - floorScore) / (maxScore - floorScore)) * 100)
  );
}

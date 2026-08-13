/**
 * Layout for the beatmap closeness strip: one dot per game against the middle
 * 80% of the map's dominant cohort.
 *
 * Everything here lives in log-ratio space. A game's `z` is standardized
 * against *its own* cohort, while the axis labels read back through the
 * dominant cohort, so plotting `z` puts a dot somewhere its own tooltip does
 * not describe on any map that spans more than one cohort. Log ratio is the
 * one scale on which position and label are the same number, and the axis
 * stays linear in it either way.
 */

import type { BeatmapClosenessSummary } from '@/lib/orpc/schema/beatmapStats';

type ClosenessGame = BeatmapClosenessSummary['games'][number];
type ClosenessCohort = NonNullable<BeatmapClosenessSummary['cohort']>;

/** Dots closer than this fraction of the domain stack instead of overlapping. Sized for the 308px plot at 390px. */
const STACK_GAP = 0.03;

/**
 * Outliers past this multiple of the band width pin to the edge of the plot,
 * so a long tail cannot squeeze the band below about a third of the domain.
 */
const OUTLIER_CAP = 1;

export interface ClosenessStripDot {
  /** Position, in log ratio. Equal to the game's own `logRatio` unless pinned. */
  plotLr: number;
  /** Stack index; 0 sits on the axis. */
  row: number;
  /** Winning score gap, percent — the number the tooltip reads out. */
  gap: number;
  /** The dot was pinned to this edge of the domain rather than plotted there. */
  clamped: 'low' | 'high' | null;
  /** Set when the game was not played in the map's dominant cohort. */
  cohortNote: string | null;
}

export interface ClosenessStrip {
  /** Ascending by `plotLr`. */
  dots: ClosenessStripDot[];
  domain: [number, number];
  /** The cohort's q10, median and q90, in log ratio. */
  band: { lo: number; mid: number; hi: number };
  /** Rows the tallest stack needs. */
  rows: number;
  clampedCount: number;
}

export function getClosenessStrip(
  games: readonly ClosenessGame[],
  cohort: ClosenessCohort,
  deciles: readonly number[],
  formatCohort: (ruleset: ClosenessGame['ruleset'], teamSize: number) => string
): ClosenessStrip {
  const toLr = (z: number) => z * cohort.sdLogRatio + cohort.meanLogRatio;
  const band = {
    lo: toLr(deciles[0]),
    mid: toLr(deciles[4]),
    hi: toLr(deciles[8]),
  };

  const logRatios = games.map((game) => game.logRatio);
  const span = band.hi - band.lo;
  const lo = Math.max(
    Math.min(band.lo, ...logRatios),
    band.lo - OUTLIER_CAP * span
  );
  const hi = Math.min(
    Math.max(band.hi, ...logRatios),
    band.hi + OUTLIER_CAP * span
  );

  const pad = (hi - lo) * 0.06 || 0.5;
  const domain: [number, number] = [lo - pad, hi + pad];

  const dots: ClosenessStripDot[] = games
    .map((game) => ({
      plotLr: Math.min(hi, Math.max(lo, game.logRatio)),
      row: 0,
      gap: (1 - Math.exp(-game.logRatio)) * 100,
      clamped:
        game.logRatio < lo
          ? ('low' as const)
          : game.logRatio > hi
            ? ('high' as const)
            : null,
      cohortNote:
        game.ruleset === cohort.ruleset && game.teamSize === cohort.teamSize
          ? null
          : formatCohort(game.ruleset, game.teamSize),
    }))
    .sort((a, b) => a.plotLr - b.plotLr);

  // Wilkinson dot binning: dots that would overlap climb off the axis instead,
  // each keeping its own x, so position still equals value inside a stack.
  const stackGap = STACK_GAP * (domain[1] - domain[0]);
  let anchor = -Infinity;
  let row = 0;
  let rows = 0;

  for (const dot of dots) {
    if (dot.plotLr - anchor < stackGap) {
      row += 1;
    } else {
      anchor = dot.plotLr;
      row = 0;
    }

    dot.row = row;
    rows = Math.max(rows, row + 1);
  }

  return {
    dots,
    domain,
    band,
    rows,
    clampedCount: dots.filter((dot) => dot.clamped !== null).length,
  };
}

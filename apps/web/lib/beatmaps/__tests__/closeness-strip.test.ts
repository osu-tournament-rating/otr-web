import { describe, expect, it } from 'bun:test';

import { Ruleset } from '@otr/core/osu';

import { lookupBaseline } from '@/lib/beatmaps/closeness';
import { getClosenessStrip } from '@/lib/beatmaps/closeness-strip';
import type { BeatmapClosenessSummary } from '@/lib/orpc/schema/beatmapStats';

type ClosenessGame = BeatmapClosenessSummary['games'][number];
type ClosenessCohort = NonNullable<BeatmapClosenessSummary['cohort']>;

const OSU_3V3 = lookupBaseline(Ruleset.Osu, 3);

/** The map's dominant cohort: every axis label reads back through this one. */
const COHORT: ClosenessCohort = {
  ruleset: Ruleset.Osu,
  teamSize: 3,
  baselineScope: OSU_3V3.scope,
  meanLogRatio: OSU_3V3.meanLogRatio,
  sdLogRatio: OSU_3V3.sdLogRatio,
};

const DECILES = [...OSU_3V3.zDecileEdges];

const BAND_LO = COHORT.meanLogRatio + DECILES[0] * COHORT.sdLogRatio;
const BAND_HI = COHORT.meanLogRatio + DECILES[8] * COHORT.sdLogRatio;
const BAND_SPAN = BAND_HI - BAND_LO;

const formatCohort = (ruleset: Ruleset, teamSize: number) =>
  `${ruleset}:${teamSize}v${teamSize}`;

/** A game standardized against its *own* cohort, exactly as the API reports it. */
function game(
  ruleset: Ruleset,
  teamSize: number,
  logRatio: number
): ClosenessGame {
  const own = lookupBaseline(ruleset, teamSize);

  return {
    logRatio,
    z: (logRatio - own.meanLogRatio) / own.sdLogRatio,
    ruleset,
    teamSize,
  };
}

function strip(games: ClosenessGame[]) {
  return getClosenessStrip(games, COHORT, DECILES, formatCohort);
}

describe('getClosenessStrip', () => {
  it('plots every game at its own log ratio, never at its z', () => {
    // A mixed-cohort map: 1v1 games standardize against a much wider baseline,
    // so their z says one thing and their score gap says another.
    const games = [
      game(Ruleset.Osu, 3, 0.05),
      game(Ruleset.Osu, 1, 0.42),
      game(Ruleset.Osu, 3, 0.95),
      game(Ruleset.Osu, 1, 1.05),
    ];
    const { dots, clampedCount } = strip(games);

    expect(clampedCount).toBe(0);
    expect(dots.map((dot) => dot.plotLr)).toEqual([0.05, 0.42, 0.95, 1.05]);

    for (const dot of dots) {
      // The tooltip's number and the dot's position are the same value.
      expect(-Math.log(1 - dot.gap / 100)).toBeCloseTo(dot.plotLr, 10);
    }

    // The regression itself: the 3v3 game at 0.95 has the higher z but the
    // smaller gap, so plotting z put it to the right of the 1v1 game at 1.05.
    const wider = dots[3];
    const narrower = dots[2];
    expect(games[3].z).toBeLessThan(games[2].z);
    expect(wider.gap).toBeGreaterThan(narrower.gap);
    expect(wider.plotLr).toBeGreaterThan(narrower.plotLr);
  });

  it('flags games played outside the dominant cohort', () => {
    const { dots } = strip([
      game(Ruleset.Osu, 3, 0.3),
      game(Ruleset.Osu, 1, 0.31),
      game(Ruleset.Mania4k, 3, 0.32),
    ]);

    expect(dots.map((dot) => dot.cohortNote)).toEqual([
      null,
      `${Ruleset.Osu}:1v1`,
      `${Ruleset.Mania4k}:3v3`,
    ]);
  });

  it('orders dots the same way their gaps read', () => {
    // The exact live inversion on /beatmaps/283992.
    const { dots } = strip([
      game(Ruleset.Osu, 1, 1.5354),
      game(Ruleset.Osu, 2, 0.0397),
      game(Ruleset.Osu, 3, 0.5445),
    ]);

    const gaps = dots.map((dot) => dot.gap);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
  });

  it('pins a far outlier to the edge instead of letting it set the scale', () => {
    const { dots, domain, band, clampedCount } = strip([
      game(Ruleset.Osu, 1, 1.5354),
    ]);

    expect(clampedCount).toBe(1);
    expect(dots[0].clamped).toBe('high');
    expect(dots[0].plotLr).toBeCloseTo(BAND_HI + BAND_SPAN, 10);
    // The pinned dot still reports its real gap, not the edge's.
    expect(dots[0].gap).toBeCloseTo((1 - Math.exp(-1.5354)) * 100, 10);

    const bandShare = (band.hi - band.lo) / (domain[1] - domain[0]);
    expect(bandShare).toBeGreaterThanOrEqual(0.43);
  });

  it('stacks dots that would otherwise overlap', () => {
    const { dots, domain, rows } = strip([
      game(Ruleset.Osu, 3, 0.3),
      game(Ruleset.Osu, 3, 0.306),
    ]);

    expect(0.006 / (domain[1] - domain[0])).toBeLessThan(0.03);
    expect(dots.map((dot) => dot.row)).toEqual([0, 1]);
    expect(rows).toBe(2);
  });

  it('leaves dots with room to breathe on the axis', () => {
    const { dots, domain, rows } = strip([
      game(Ruleset.Osu, 3, 0.3),
      game(Ruleset.Osu, 3, 0.331),
    ]);

    expect(0.031 / (domain[1] - domain[0])).toBeGreaterThan(0.03);
    expect(dots.map((dot) => dot.row)).toEqual([0, 0]);
    expect(rows).toBe(1);
  });

  it('charts a lone game against the band alone', () => {
    const { dots, domain, rows, clampedCount } = strip([
      game(Ruleset.Osu, 3, 0.3),
    ]);

    expect(rows).toBe(1);
    expect(clampedCount).toBe(0);
    expect(dots[0].plotLr).toBe(0.3);
    expect(domain.every(Number.isFinite)).toBe(true);
    expect(domain[0]).toBeLessThan(BAND_LO);
    expect(domain[1]).toBeGreaterThan(BAND_HI);
  });
});

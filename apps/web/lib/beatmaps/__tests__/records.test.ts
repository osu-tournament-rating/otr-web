import { VerificationStatus } from '@otr/core/osu';
import { describe, expect, test } from 'bun:test';

import type {
  BeatmapTournamentUsage,
  BeatmapUsagePoint,
} from '@/lib/orpc/schema/beatmapStats';
import {
  formatQuarterLong,
  getMostUsedInPool,
  getPoolDate,
  getPoolPickRate,
  isPoolVerified,
  sortPoolsByDate,
  sortPoolsByGames,
  summarizeActivity,
} from '../records';

function pool(
  overrides: Omit<Partial<BeatmapTournamentUsage>, 'tournament'> & {
    tournament?: Partial<BeatmapTournamentUsage['tournament']>;
  } = {}
): BeatmapTournamentUsage {
  const { tournament, ...rest } = overrides;

  return {
    tournament: {
      id: 1,
      name: 'Test Cup',
      abbreviation: 'TC',
      ruleset: 0,
      lobbySize: 1,
      startTime: null,
      endTime: null,
      verificationStatus: VerificationStatus.Verified,
      isLazer: false,
      ...tournament,
    },
    gameCount: 0,
    scoreCount: 0,
    mostCommonMod: 0,
    mostCommonModFreemod: false,
    firstPlayedAt: null,
    rankRangeLowerBound: 1,
    avgRating: null,
    avgScore: null,
    ...rest,
  };
}

function usage(
  quarter: string,
  gameCount: number,
  pooledCount = 0
): BeatmapUsagePoint {
  return { quarter, gameCount, pooledCount };
}

describe('formatQuarterLong', () => {
  test('renders a usage bucket as a readable quarter', () => {
    expect(formatQuarterLong('2023-Q3')).toBe('Q3 2023');
  });

  test('passes through anything that is not a quarter bucket', () => {
    expect(formatQuarterLong('unknown')).toBe('unknown');
  });
});

describe('summarizeActivity', () => {
  test('spans the first and last quarter with any activity', () => {
    const summary = summarizeActivity([
      usage('2020-Q1', 0),
      usage('2020-Q2', 4),
      usage('2020-Q3', 0),
      usage('2020-Q4', 0, 2),
      usage('2021-Q1', 0),
    ]);

    expect(summary.firstActive?.quarter).toBe('2020-Q2');
    expect(summary.lastActive?.quarter).toBe('2020-Q4');
    expect(summary.activeQuarters).toBe(2);
  });

  test('scales to the game series only, since only games render as bars', () => {
    expect(summarizeActivity([usage('2020-Q1', 3, 9)]).maxGames).toBe(3);
    expect(
      summarizeActivity([usage('2020-Q1', 3, 9), usage('2020-Q2', 7)]).maxGames
    ).toBe(7);
  });

  test('reports no span when nothing was ever played or pooled', () => {
    const summary = summarizeActivity([
      usage('2020-Q1', 0),
      usage('2020-Q2', 0),
    ]);

    expect(summary.firstActive).toBeNull();
    expect(summary.lastActive).toBeNull();
    expect(summary.activeQuarters).toBe(0);
    expect(summary.maxGames).toBe(0);
  });
});

describe('getPoolDate', () => {
  test('prefers when the beatmap was first played', () => {
    expect(
      getPoolDate(
        pool({
          firstPlayedAt: '2023-05-01T00:00:00Z',
          tournament: { endTime: '2023-06-01T00:00:00Z' },
        })
      )
    ).toBe('2023-05-01T00:00:00Z');
  });

  test('falls back to the tournament end, then its start', () => {
    expect(
      getPoolDate(pool({ tournament: { endTime: '2023-06-01T00:00:00Z' } }))
    ).toBe('2023-06-01T00:00:00Z');
    expect(
      getPoolDate(pool({ tournament: { startTime: '2023-01-01T00:00:00Z' } }))
    ).toBe('2023-01-01T00:00:00Z');
    expect(getPoolDate(pool())).toBeNull();
  });
});

describe('pool ordering', () => {
  const older = pool({
    tournament: { id: 1 },
    gameCount: 5,
    firstPlayedAt: '2021-01-01T00:00:00Z',
  });
  const newer = pool({
    tournament: { id: 2 },
    gameCount: 5,
    firstPlayedAt: '2024-01-01T00:00:00Z',
  });
  const busiest = pool({
    tournament: { id: 3 },
    gameCount: 12,
    firstPlayedAt: '2019-01-01T00:00:00Z',
  });

  test('sorts most recent first by pool date', () => {
    expect(
      sortPoolsByDate([older, busiest, newer]).map((p) => p.tournament.id)
    ).toEqual([2, 1, 3]);
  });

  test('sorts most played first, breaking ties on recency', () => {
    expect(
      sortPoolsByGames([older, newer, busiest]).map((p) => p.tournament.id)
    ).toEqual([3, 2, 1]);
  });

  test('leaves the caller’s array untouched', () => {
    const input = [older, newer];
    sortPoolsByGames(input);
    expect(input.map((p) => p.tournament.id)).toEqual([1, 2]);
  });
});

describe('isPoolVerified', () => {
  test('accepts only fully verified tournaments', () => {
    expect(isPoolVerified(pool())).toBe(true);
    expect(
      isPoolVerified(
        pool({
          tournament: { verificationStatus: VerificationStatus.Rejected },
        })
      )
    ).toBe(false);
    expect(
      isPoolVerified(
        pool({
          tournament: { verificationStatus: VerificationStatus.PreVerified },
        })
      )
    ).toBe(false);
  });
});

describe('getMostUsedInPool', () => {
  test('picks the tournament with the most scores, not the most games', () => {
    const manyGames = pool({
      tournament: { id: 1 },
      gameCount: 30,
      scoreCount: 60,
    });
    const manyScores = pool({
      tournament: { id: 2 },
      gameCount: 12,
      scoreCount: 120,
    });

    expect(getMostUsedInPool([manyGames, manyScores])?.tournament.id).toBe(2);
  });

  test('ignores pool records that produced no scores', () => {
    expect(
      getMostUsedInPool([pool(), pool({ tournament: { id: 2 } })])
    ).toBeNull();
  });

  test('returns nothing when the beatmap has never been pooled', () => {
    expect(getMostUsedInPool([])).toBeNull();
  });
});

describe('getPoolPickRate', () => {
  test('reports the share of pool records that saw play', () => {
    expect(getPoolPickRate(13, 21)).toBe(62);
    expect(getPoolPickRate(3, 4)).toBe(75);
  });

  test('has no rate when the beatmap was never pooled', () => {
    expect(getPoolPickRate(0, 0)).toBeNull();
  });

  test('reports the extremes exactly', () => {
    expect(getPoolPickRate(0, 12)).toBe(0);
    expect(getPoolPickRate(12, 12)).toBe(100);
  });

  test('never rounds a single pick down to never played', () => {
    expect(getPoolPickRate(1, 400)).toBe(1);
  });

  test('never rounds a single skip up to always played', () => {
    expect(getPoolPickRate(399, 400)).toBe(99);
  });
});

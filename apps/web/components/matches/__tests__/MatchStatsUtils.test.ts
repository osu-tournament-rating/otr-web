import { describe, expect, it } from 'bun:test';
import { Team, VerificationStatus } from '@otr/core/osu';

import type { Game, MatchDetail } from '@/lib/orpc/schema/match';
import {
  calculateHighlightStats,
  formatScore,
  processMatchStatistics,
} from '../MatchStatsUtils';
import { buildTeamScoreChartData } from '../MatchTeamScoresChart';

function createMatch(): MatchDetail {
  return {
    players: [
      {
        id: 10,
        osuId: 100,
        username: 'Red player',
      },
      {
        id: 20,
        osuId: 200,
        username: 'Blue player',
      },
    ],
    playerMatchStats: [
      {
        id: 1,
        playerId: 10,
        matchId: 50,
        won: false,
        gamesWon: 6,
        gamesLost: 7,
        gamesPlayed: 13,
        averageScore: 400_000,
        averageAccuracy: 0.97,
        averageMisses: 3,
        averagePlacement: 1.8,
        matchCost: 1.1,
        teammateIds: [],
        opponentIds: [20],
      },
      {
        id: 2,
        playerId: 20,
        matchId: 50,
        won: true,
        gamesWon: 7,
        gamesLost: 6,
        gamesPlayed: 13,
        averageScore: 425_000,
        averageAccuracy: 0.95,
        averageMisses: 4,
        averagePlacement: 1.6,
        matchCost: 1.3,
        teammateIds: [],
        opponentIds: [10],
      },
    ],
    ratingAdjustments: [
      {
        playerId: 10,
        ratingBefore: 1_400,
        ratingAfter: 1_410,
        ratingDelta: 10,
        volatilityBefore: 100,
        volatilityAfter: 95,
        volatilityDelta: -5,
      },
      {
        playerId: 20,
        ratingBefore: 1_490,
        ratingAfter: 1_500,
        ratingDelta: 10,
        volatilityBefore: 90,
        volatilityAfter: 85,
        volatilityDelta: -5,
      },
    ],
    rosters: [
      { id: 1, roster: [10], team: Team.Red, score: 6 },
      { id: 2, roster: [20], team: Team.Blue, score: 7 },
    ],
    winRecord: {
      matchId: 50,
      isTied: false,
      loserRoster: [10],
      winnerRoster: [20],
      loserPoints: 6,
      winnerPoints: 7,
      loserTeam: Team.Red,
      winnerTeam: Team.Blue,
    },
    games: [
      { verificationStatus: VerificationStatus.PreVerified },
      { verificationStatus: VerificationStatus.Verified },
    ],
  } as unknown as MatchDetail;
}

describe('match statistics processing', () => {
  it('joins player, rating, match cost, and roster team data', () => {
    const match = createMatch();
    const players = processMatchStatistics(match, match.players);

    expect(players).toHaveLength(2);
    expect(players[0]).toMatchObject({
      playerId: 10,
      team: 'red',
      matchCost: 1.1,
      won: false,
      ratingBefore: 1_400,
      ratingAfter: 1_410,
      ratingDelta: 10,
    });
    expect(players[1]).toMatchObject({
      playerId: 20,
      team: 'blue',
      matchCost: 1.3,
      won: true,
    });
  });

  it('builds a stable six-card summary from verified match data', () => {
    const match = createMatch();
    const players = processMatchStatistics(match, match.players);
    const summary = calculateHighlightStats(players, match);

    expect(summary).toHaveLength(6);
    expect(summary[0]).toMatchObject({
      id: 'match-result',
      value: '6 – 7',
      sublabel: 'Blue wins',
    });
    expect(summary.find((stat) => stat.id === 'rated-games')?.value).toBe('1');
    expect(summary.find((stat) => stat.id === 'average-rating')?.value).toBe(
      '1455'
    );
    expect(summary.find((stat) => stat.id === 'match-cost')).toMatchObject({
      value: '1.30',
      player: { id: 20, username: 'Blue player' },
    });
  });

  it('does not invent a winner when no usable win record exists', () => {
    const match = createMatch();
    match.winRecord = null;
    match.rosters = [{ id: 1, roster: [10, 20], team: Team.NoTeam, score: 13 }];
    match.playerMatchStats = match.playerMatchStats.map((stats) => ({
      ...stats,
      won: true,
      gamesWon: stats.gamesPlayed,
      gamesLost: 0,
    }));

    const players = processMatchStatistics(match, match.players);
    const summary = calculateHighlightStats(players, match);

    expect(players.every((player) => !player.won)).toBe(true);
    expect(summary[0]).toMatchObject({
      value: '—',
      sublabel: 'Result unavailable',
    });
  });

  it('does not label tied players as winners', () => {
    const match = createMatch();
    match.winRecord = {
      ...match.winRecord!,
      isTied: true,
      winnerRoster: [10, 20],
      winnerPoints: 6,
      loserPoints: 6,
    };

    const players = processMatchStatistics(match, match.players);
    const summary = calculateHighlightStats(players, match);

    expect(players.every((player) => !player.won)).toBe(true);
    expect(summary[0].sublabel).toBe('Draw');
  });
});

describe('team score chart data', () => {
  it('uses only verified games and scores while preserving game numbering', () => {
    const games = [
      {
        verificationStatus: VerificationStatus.PreVerified,
        scores: [],
      },
      {
        verificationStatus: VerificationStatus.Verified,
        scores: [
          {
            team: Team.Red,
            score: 400_000,
            verificationStatus: VerificationStatus.Verified,
          },
          {
            team: Team.Red,
            score: 999_999,
            verificationStatus: VerificationStatus.Rejected,
          },
          {
            team: Team.Blue,
            score: 350_000,
            verificationStatus: VerificationStatus.Verified,
          },
        ],
        beatmap: null,
        mods: 0,
      },
      {
        verificationStatus: VerificationStatus.Verified,
        scores: [
          {
            team: Team.NoTeam,
            score: 500_000,
            verificationStatus: VerificationStatus.Verified,
          },
        ],
        beatmap: null,
        mods: 0,
      },
    ] as unknown as Game[];

    expect(buildTeamScoreChartData(games)).toEqual([
      {
        mapNumber: 2,
        mapLabel: '2',
        redScore: 400_000,
        blueScore: 350_000,
        winner: 'red',
        beatmapTitle: 'Unknown title',
        beatmapArtist: 'Unknown artist',
        beatmapDifficulty: 'Unknown difficulty',
        mods: 'NM',
        scoreDifference: 50_000,
      },
    ]);
  });
});

describe('formatScore', () => {
  it('uses compact score labels at common boundaries', () => {
    expect(formatScore(999)).toBe('999');
    expect(formatScore(1_500)).toBe('1.5K');
    expect(formatScore(15_500)).toBe('16K');
    expect(formatScore(451_900)).toBe('451K');
    expect(formatScore(1_250_000)).toBe('1.3M');
  });
});

import type { PlayerStats, PlayerRatingStats, PlayerCompact } from '@/lib/orpc/schema/playerStats';

export const mockPlayerInfo: PlayerCompact = {
  id: 1,
  osuId: 12345,
  username: 'TestPlayer',
  country: 'US',
  defaultRuleset: 0,
};

export const mockPlayerRating: PlayerRatingStats = {
  player: mockPlayerInfo,
  ruleset: 0,
  rating: 1500,
  volatility: 150,
  percentile: 0.95,
  globalRank: 42,
  countryRank: 5,
  tournamentsPlayed: 10,
  matchesPlayed: 50,
  winRate: 0.65,
  isProvisional: false,
  tierProgress: {
    currentTier: 'diamond',
    currentSubTier: 2,
    nextTier: 'diamond',
    nextSubTier: 1,
    ratingForNextTier: 1550,
    ratingForNextMajorTier: 1700,
    nextMajorTier: 'master',
    subTierFillPercentage: 0.5,
    majorTierFillPercentage: 0.75,
  },
  adjustments: [
    {
      playerId: 1,
      adjustmentType: 0,
      timestamp: '2024-01-01T00:00:00.000Z',
      ratingBefore: 1400,
      ratingAfter: 1450,
      volatilityBefore: 160,
      volatilityAfter: 155,
      matchId: 1,
      ratingDelta: 50,
      volatilityDelta: -5,
      match: {
        id: 1,
        name: 'Test Match 1',
        tournamentId: 1,
      },
    },
    {
      playerId: 1,
      adjustmentType: 0,
      timestamp: '2024-02-01T00:00:00.000Z',
      ratingBefore: 1450,
      ratingAfter: 1500,
      volatilityBefore: 155,
      volatilityAfter: 150,
      matchId: 2,
      ratingDelta: 50,
      volatilityDelta: -5,
      match: {
        id: 2,
        name: 'Test Match 2',
        tournamentId: 1,
      },
    },
  ],
};

export const mockPlayerStats: PlayerStats = {
  playerInfo: mockPlayerInfo,
  ruleset: 0,
  rating: mockPlayerRating,
  matchStats: {
    averageMatchCostAggregate: 1.2,
    highestRating: 1520,
    ratingGained: 100,
    gamesWon: 150,
    gamesLost: 80,
    gamesPlayed: 230,
    matchesWon: 32,
    matchesLost: 18,
    matchesPlayed: 50,
    gameWinRate: 0.65,
    matchWinRate: 0.64,
    bestWinStreak: 5,
    matchAverageScoreAggregate: 750000,
    matchAverageMissesAggregate: 3.5,
    matchAverageAccuracyAggregate: 0.985,
    averageGamesPlayedAggregate: 4.6,
    averagePlacingAggregate: 2.1,
    periodStart: '2024-01-01',
    periodEnd: '2024-12-01',
  },
  modStats: [
    { mods: 0, count: 100, averageScore: 800000 },
    { mods: 8, count: 50, averageScore: 750000 },
    { mods: 16, count: 30, averageScore: 700000 },
  ],
  frequentTeammates: [
    {
      player: { ...mockPlayerInfo, id: 10, username: 'Teammate1' },
      frequency: 15,
    },
  ],
  frequentOpponents: [
    {
      player: { ...mockPlayerInfo, id: 20, username: 'Opponent1' },
      frequency: 12,
    },
  ],
};

export const mockPlayerStatsNoRating: PlayerStats = {
  ...mockPlayerStats,
  rating: null,
  matchStats: null,
};

import type { LeaderboardResponse, LeaderboardEntry } from '@/lib/orpc/schema/leaderboard';

export const mockLeaderboardEntry: LeaderboardEntry = {
  player: {
    id: 1,
    osuId: 12345,
    username: 'TestPlayer1',
    country: 'US',
  },
  ruleset: 0,
  rating: 1500,
  volatility: 150,
  percentile: 0.95,
  globalRank: 1,
  countryRank: 1,
  tournamentsPlayed: 10,
  matchesPlayed: 50,
  winRate: 0.65,
  tier: 'diamond',
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
};

export const mockLeaderboardResponse: LeaderboardResponse = {
  page: 1,
  pageSize: 50,
  pages: 10,
  total: 500,
  ruleset: 0,
  leaderboard: [
    mockLeaderboardEntry,
    {
      ...mockLeaderboardEntry,
      player: {
        id: 2,
        osuId: 23456,
        username: 'TestPlayer2',
        country: 'JP',
      },
      globalRank: 2,
      countryRank: 1,
      rating: 1480,
    },
    {
      ...mockLeaderboardEntry,
      player: {
        id: 3,
        osuId: 34567,
        username: 'TestPlayer3',
        country: 'KR',
      },
      globalRank: 3,
      countryRank: 1,
      rating: 1460,
    },
  ],
};

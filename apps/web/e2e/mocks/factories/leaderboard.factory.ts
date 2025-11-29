import type { LeaderboardResponse, LeaderboardEntry } from '@/lib/orpc/schema/leaderboard';
import { mockLeaderboardEntry, mockLeaderboardResponse } from '../data/leaderboard.mock';

type LeaderboardEntryOverrides = Partial<LeaderboardEntry> & {
  player?: Partial<LeaderboardEntry['player']>;
};

export function createLeaderboardEntry(
  overrides: LeaderboardEntryOverrides = {}
): LeaderboardEntry {
  const { player, ...rest } = overrides;

  return {
    ...mockLeaderboardEntry,
    ...rest,
    player: {
      ...mockLeaderboardEntry.player,
      ...player,
    },
  };
}

type LeaderboardResponseOverrides = Partial<Omit<LeaderboardResponse, 'leaderboard'>> & {
  leaderboard?: LeaderboardEntry[];
};

export function createLeaderboardResponse(
  overrides: LeaderboardResponseOverrides = {}
): LeaderboardResponse {
  return {
    ...mockLeaderboardResponse,
    ...overrides,
  };
}

export function createEmptyLeaderboardResponse(): LeaderboardResponse {
  return {
    page: 1,
    pageSize: 50,
    pages: 0,
    total: 0,
    ruleset: 0,
    leaderboard: [],
  };
}

export function createLeaderboardWithPlayers(count: number): LeaderboardResponse {
  const leaderboard: LeaderboardEntry[] = [];

  for (let i = 0; i < count; i++) {
    leaderboard.push(
      createLeaderboardEntry({
        player: {
          id: i + 1,
          osuId: 10000 + i,
          username: `Player${i + 1}`,
          country: ['US', 'JP', 'KR', 'DE', 'FR'][i % 5],
        },
        globalRank: i + 1,
        rating: 2000 - i * 10,
      })
    );
  }

  return createLeaderboardResponse({
    leaderboard,
    total: count,
    pages: Math.ceil(count / 50),
  });
}

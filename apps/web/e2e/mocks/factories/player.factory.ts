import type { PlayerStats, PlayerCompact } from '@/lib/orpc/schema/playerStats';
import { mockPlayerStats, mockPlayerInfo } from '../data/players.mock';

type PlayerInfoOverrides = Partial<PlayerCompact>;

export function createPlayerInfo(overrides: PlayerInfoOverrides = {}): PlayerCompact {
  return {
    ...mockPlayerInfo,
    ...overrides,
  };
}

type PlayerStatsOverrides = Partial<Omit<PlayerStats, 'playerInfo' | 'rating'>> & {
  playerInfo?: PlayerInfoOverrides;
  rating?: PlayerStats['rating'] | null;
};

export function createPlayerStats(overrides: PlayerStatsOverrides = {}): PlayerStats {
  const { playerInfo, rating, ...rest } = overrides;

  return {
    ...mockPlayerStats,
    ...rest,
    playerInfo: {
      ...mockPlayerStats.playerInfo,
      ...playerInfo,
    },
    rating: rating === null ? null : rating ?? mockPlayerStats.rating,
  };
}

export function createPlayerWithNoRating(
  playerInfoOverrides: PlayerInfoOverrides = {}
): PlayerStats {
  return createPlayerStats({
    playerInfo: playerInfoOverrides,
    rating: null,
    matchStats: null,
  });
}

export function createTopPlayer(rank: number): PlayerStats {
  return createPlayerStats({
    playerInfo: {
      username: `TopPlayer${rank}`,
      id: rank,
      osuId: 10000 + rank,
    },
    rating: mockPlayerStats.rating
      ? {
          ...mockPlayerStats.rating,
          globalRank: rank,
          rating: 2500 - rank * 50,
        }
      : null,
  });
}

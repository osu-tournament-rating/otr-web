import {
  PlayersGetStatsRequestParams,
  TournamentCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { players } from '../api/server';
import { cache } from 'react';

export async function getStats(params: PlayersGetStatsRequestParams) {
  const { result } = await players.getStats(params);
  return result;
}

/**
 * Get player stats with caching
 * Uses React's cache() function to prevent duplicate API calls within the same request.
 * Parameters are destructured to primitives to ensure proper cache key generation.
 */
export const getStatsCached = cache(
  async (key: string, dateMin?: Date, dateMax?: Date, ruleset?: number) => {
    const { result } = await players.getStats({
      key,
      dateMin,
      dateMax,
      ruleset,
    });
    return result;
  }
);

/**
 * Get all tournaments a player has participated in, with caching.
 * Uses React's cache() function to prevent duplicate API calls within the same request.
 * Returns the most recent tournaments first.
 */
export const getPlayerTournamentsCached = cache(
  async (playerId: number): Promise<TournamentCompactDTO[]> => {
    const { result } = await players.getTournaments({
      key: playerId.toString(),
    });
    return result;
  }
);

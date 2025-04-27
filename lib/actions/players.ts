import { PlayersGetStatsRequestParams } from '@osu-tournament-rating/otr-api-client';
import { players } from '../api';

export async function getStats(params: PlayersGetStatsRequestParams) {
  const { result } = await players.getStats(params);
  return result;
}

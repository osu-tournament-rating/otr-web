import type { RouteHandler } from '../../fixtures/api-mock.fixture';
import { createLeaderboardResponse } from '../factories/leaderboard.factory';
import { createPlayerStats } from '../factories/player.factory';
import { mockTournamentList } from '../factories/tournament.factory';

export const defaultOrpcHandlers: RouteHandler[] = [
  {
    path: 'leaderboard.list',
    response: createLeaderboardResponse(),
  },
  {
    path: 'leaderboard.friends',
    response: createLeaderboardResponse({ total: 0, leaderboard: [] }),
  },
  {
    path: 'players.stats',
    response: createPlayerStats(),
  },
  {
    path: 'players.beatmaps',
    response: { beatmaps: [], totalCount: 0 },
  },
  {
    path: 'players.tournaments',
    response: [],
  },
  {
    path: 'tournaments.list',
    response: mockTournamentList,
  },
  {
    path: 'tournaments.get',
    response: null,
  },
  {
    path: 'search.query',
    response: { players: [], tournaments: [], matches: [] },
  },
  {
    path: 'stats.platform',
    response: {
      totalPlayers: 10000,
      totalTournaments: 500,
      totalMatches: 5000,
      activePlayersLast30Days: 2500,
    },
  },
  {
    path: 'users.me',
    response: null,
  },
];

export function createHandler(
  path: string,
  response: unknown,
  status = 200
): RouteHandler {
  return { path, response, status };
}

export { Ruleset } from '@otr/core';

export const TEST_PLAYER_ID = 440;
export const TEST_TOURNAMENT_ID = 775;
export const TEST_PUBLIC_TOURNAMENT_ID = 2693;
export const TEST_MATCH_ID = 134010;
export const TEST_BEATMAP_ID = 3506;
export const TEST_BEATMAP_OSU_ID = 665721;
export const ROUTES = {
  playerProfile: (id: number) => `/players/${id}`,
  auditLogs: '/tools/audit-logs',
  auditTournament: (id: number) => `/audit/tournaments/${id}`,
  auditMatch: (id: number) => `/audit/matches/${id}`,
  stats: '/stats',
  home: '/',
  leaderboard: '/leaderboard',
  tournaments: '/tournaments',
  tournament: (id: number) => `/tournaments/${id}`,
  tournamentSubmit: '/tournaments/submit',
  beatmaps: '/beatmaps',
  beatmap: (id: number) => `/beatmaps/${id}`,
  match: (id: number) => `/matches/${id}`,
} as const;

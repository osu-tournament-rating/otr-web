export { Ruleset } from '@otr/core';

export const TEST_PLAYER_ID = 440;
export const TEST_TOURNAMENT_ID = 775;
export const TEST_PUBLIC_TOURNAMENT_ID = 2693;
export const TEST_MATCH_ID = 134010;
export const TEST_BEATMAP_ID = 3506;
export const TEST_BEATMAP_OSU_ID = 665721;

/**
 * Entity IDs that have audit-log history in the dev database, used by the
 * audit-timeline specs to assert real diff content renders.
 */
export const TEST_AUDIT_MATCH_ID = 29473;
export const TEST_AUDIT_GAME_ID = 364304;
export const TEST_AUDIT_SCORE_ID = 152388;

export const ROUTES = {
  playerProfile: (id: number) => `/players/${id}`,
  auditLogs: '/tools/audit-logs',
  auditTournament: (id: number) => `/audit/tournaments/${id}`,
  auditMatch: (id: number) => `/audit/matches/${id}`,
  auditGame: (id: number) => `/audit/games/${id}`,
  auditScore: (id: number) => `/audit/scores/${id}`,
  stats: '/stats',
  home: '/',
  leaderboard: '/leaderboard',
  tournaments: '/tournaments',
  tournament: (id: number) => `/tournaments/${id}`,
  tournamentSubmit: '/tournaments/submit',
  beatmaps: '/beatmaps',
  beatmap: (id: number) => `/beatmaps/${id}`,
  match: (id: number) => `/matches/${id}`,
  settings: '/settings',
  admin: '/admin',
  adminReports: '/admin/reports',
  filter: '/tools/filter',
  filterReports: '/tools/filter-reports',
  spec: '/spec',
  banned: '/auth/banned',
  unauthorized: '/unauthorized',
} as const;

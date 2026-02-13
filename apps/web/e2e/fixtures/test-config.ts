export { Ruleset } from '@otr/core';

export const TEST_PLAYER_ID = 440;
export const TEST_TOURNAMENT_ID = 775;
export const ROUTES = {
  playerProfile: (id: number) => `/players/${id}`,
  auditLogs: '/tools/audit-logs',
  auditTournament: (id: number) => `/audit/tournaments/${id}`,
  auditMatch: (id: number) => `/audit/matches/${id}`,
} as const;

export { Ruleset } from '@otr/core';

export const TEST_PLAYER_ID = 440;
export const ROUTES = {
  playerProfile: (id: number) => `/players/${id}`,
} as const;

export const TEST_PLAYER_ID = 440;
export const ROUTES = {
  playerProfile: (id: number) => `/players/${id}`,
} as const;

export const RULESETS = {
  osu: 0,
  taiko: 1,
  catch: 2,
  mania4k: 4,
  mania7k: 5,
} as const;

/** The tournament page's views, in tab order; `?tab=` picks one. */
export const TOURNAMENT_TABS = [
  'matches',
  'beatmaps',
  'ratings',
  'stats',
] as const;

export type TournamentTab = (typeof TOURNAMENT_TABS)[number];

export const DEFAULT_TOURNAMENT_TAB: TournamentTab = 'matches';

import {
  defineListParams,
  listStateHref,
  searchParam,
} from '@/lib/kit/lists/params';

/** The lists a header search group can open, already searched. */
export type SeeAllTarget = 'players' | 'tournaments' | 'beatmaps';

/**
 * Every list keeps its search term in `q` (`searchParam()` under that name),
 * so one spec builds the address for each. Players have no list of their
 * own; their group opens the leaderboard's player search.
 */
const SEARCH_ONLY_PARAMS = defineListParams({ q: searchParam() });

const SEE_ALL_PATHS: Record<SeeAllTarget, string> = {
  players: '/leaderboard',
  tournaments: '/tournaments',
  beatmaps: '/beatmaps',
};

/** The list's address with `term` as its search: `/tournaments?q=world+cup`. */
export function getSeeAllHref(target: SeeAllTarget, term: string): string {
  return listStateHref(SEE_ALL_PATHS[target], SEARCH_ONLY_PARAMS, { q: term });
}

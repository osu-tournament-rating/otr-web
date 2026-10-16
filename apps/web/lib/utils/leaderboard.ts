import { leaderboardTierKeys } from '@/lib/orpc/schema/leaderboard';

/**
 * The tier keys the leaderboard's `tiers` URL param accepts. The page's list
 * state lives in `app/leaderboard/list-params.ts`.
 */
export const leaderboardTierFilterValues = leaderboardTierKeys;

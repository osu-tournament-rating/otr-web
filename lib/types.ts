import { z } from 'zod';

const leaderboardsTierNames = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'elite-grandmaster',
] as const;

const leaderboardsTypes = ['global', 'country'] as const;

export const LeaderboardsQuerySchema = z.object({
  type: z.enum(leaderboardsTypes).default('global'),
  page: z.number().gte(1).default(1),
  rank: z.array(z.number().positive()).max(2).nullish(),
  rating: z.array(z.number().positive().gte(100)).max(2).optional(),
  matches: z.array(z.number().positive()).max(2).optional(),
  winrate: z.array(z.number().gte(0.01).lte(1)).max(2).optional(),
  inclTier: z.array(z.enum(leaderboardsTierNames)).optional(),
  exclTier: z.array(z.enum(leaderboardsTierNames)).optional(),
  pageSize: z.number().default(25),
});

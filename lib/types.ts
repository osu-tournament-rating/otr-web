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

export const MatchesSubmitFormSchema = z.object({
  tournamentName: z.string().min(1),
  abbreviation: z.string().min(1),
  forumPost: z
    .string()
    .url()
    .startsWith('https://osu.ppy.sh/community/forums/topics/')
    .min(1),
  rankRangeLowerBound: z.number().min(1),
  teamSize: z.number().min(1).max(8),
  mode: z.number().min(0).max(3),
  submitterId: z.number().positive(),
  ids: z
    .array(
      z
        .number({
          required_error: 'osu! match link or lobby id required',
          invalid_type_error:
            'Failed to parse one or more entries, ensure all entries are match IDs or osu! match URLs only, one per line',
        })
        .positive()
    )
    .min(1),
});

export interface User {
  "id": number,
  "userId": number,
  "osuId": number,
  "osuCountry": string,
  "osuPlayMode": number,
  "username": string,
  "roles": [
    string
  ]
} 

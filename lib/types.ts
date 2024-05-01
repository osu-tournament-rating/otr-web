import { SessionOptions } from 'iron-session';
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
  winRate: z.array(z.number().gte(0.01).lte(1)).max(2).optional(),
  tiers: z.array(z.enum(leaderboardsTierNames)).optional(),
  pageSize: z.number().default(25),
});

export const MatchesSubmitFormSchema = z.object({
  tournamentName: z.string().min(1),
  abbreviation: z.string().min(1),
  forumPost: z.union([
    z
      .string()
      .url()
      .startsWith('https://osu.ppy.sh/community/forums/topics/')
      .min(1),
    z
      .string()
      .url()
      .startsWith('https://osu.ppy.sh/wiki/en/Tournaments/')
      .min(1),
  ]),
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

export interface SessionUser {
  id?: number;
  playerId?: number;
  osuId?: number;
  osuCountry?: string;
  osuPlayMode?: number;
  osuPlayModeSelected?: number;
  username?: string;
  scopes?: [string];
  accessToken?: string;
  refreshToken?: string;
  isLogged: boolean;
  isWhitelisted?: boolean;
}

export const defaultSessionUser: SessionUser = {
  isLogged: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'otr-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3550, //3600
  },
};

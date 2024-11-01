import CtbSVG from '@/public/icons/Ruleset Catch.svg';
import ManiaSVG from '@/public/icons/Ruleset Mania.svg';
import StandardSVG from '@/public/icons/Ruleset Standard.svg';
import TaikoSVG from '@/public/icons/Ruleset Taiko.svg';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const modeIcons: {
  [key: string]: { image: any; alt: string; altTournamentList: string };
} = {
  '0': {
    image: StandardSVG,
    alt: 'Standard',
    altTournamentsList: 'Standard',
  },
  '1': {
    image: TaikoSVG,
    alt: 'Taiko',
    altTournamentsList: 'Taiko',
  },
  '2': {
    image: CtbSVG,
    alt: 'CTB',
    altTournamentsList: 'Catch',
  },
  '3': {
    image: ManiaSVG,
    alt: 'Mania (Other)',
    altTournamentsList: 'Mania (Other)',
  },
  '4': {
    image: ManiaSVG,
    alt: 'Mania 4K',
    altTournamentsList: 'Mania 4K',
  },
  '5': {
    image: ManiaSVG,
    alt: 'Mania 7K',
    altTournamentsList: 'Mania 7K',
  },
} as const;

export const dateFormatOptions = {
  tournaments: {
    header: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    },
    listItem: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  },
};

const userpageTimeValues = ['90', '180', '365', '730'] as const;

export const UserpageQuerySchema = z.object({
  time: z.enum(userpageTimeValues).optional(),
});

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

export const TournamentsQuerySchema = z.object({
  page: z.number().gte(1).default(1),
});

export const MatchesSubmitFormSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  forumUrl: z.union([
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
  lobbySize: z.number().min(1).max(8),
  ruleset: z.number().min(0).max(5),
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

export const matchesVerificationStatuses = {
  '0': {},
};

export const statusButtonTypes = {
  0: { order: 0, className: 'pending', text: 'Pending' }, // None
  1: { order: 3, className: 'prerejected', text: 'Pre-rejected' }, // PreRejected
  2: { order: 2, className: 'preverified', text: 'Pre-verified' }, // PreVerified
  3: { order: 4, className: 'rejected', text: 'Rejected' }, // Rejected
  4: { order: 1, className: 'verified', text: 'Verified' }, // Verified
};

export interface SessionUser {
  id?: number;
  playerId?: number;
  osuId?: number;
  osuCountry?: string;
  osuPlayMode?: number;
  username?: string;
  scopes?: string[];
  isLogged: boolean;
  osuOauthState?: string;
  accessToken?: string;
  refreshToken?: string;
};

/** Names of available cookies */
export enum CookieNames {
  /** The {@link Ruleset} currently selected by the user in the navbar */
  SelectedRuleset = 'OTR-selected-ruleset'
}

/** Parameters used to get the session as an alternative to using read only cookies */
export type GetSessionParams = {
  req: NextRequest,
  res: NextResponse<unknown>
};
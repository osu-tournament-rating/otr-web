import CtbSVG from '@/public/icons/Ruleset Catch.svg?url';
import ManiaSVG from '@/public/icons/Ruleset Mania.svg?url';
import StandardSVG from '@/public/icons/Ruleset Standard.svg?url';
import TaikoSVG from '@/public/icons/Ruleset Taiko.svg?url';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/** Represents an icon for a {@link Ruleset} */
export interface RulesetIcon {
  /** Image ref */
  image: any;

  /** Alt text */
  alt: string;

  /** Alt text for tournaments list */
  altTournamentsList: string;
};

/** Mapping of {@link RulesetIcon}s indexed by {@link Ruleset} */
export const rulesetIcons: { [key in Ruleset]: RulesetIcon } = {
  [Ruleset.Osu]: {
    image: StandardSVG,
    alt: 'osu!',
    altTournamentsList: 'Standard',
  },
  [Ruleset.Taiko]: {
    image: TaikoSVG,
    alt: 'osu!Taiko',
    altTournamentsList: 'Taiko',
  },
  [Ruleset.Catch]: {
    image: CtbSVG,
    alt: 'osu!Catch',
    altTournamentsList: 'Catch',
  },
  [Ruleset.ManiaOther]: {
    image: ManiaSVG,
    alt: 'osu!Mania',
    altTournamentsList: 'Mania (Other)',
  },
  [Ruleset.Mania4k]: {
    image: ManiaSVG,
    alt: 'osu!Mania 4K',
    altTournamentsList: 'Mania 4K',
  },
  [Ruleset.Mania7k]: {
    image: ManiaSVG,
    alt: 'osu!Mania 7K',
    altTournamentsList: 'Mania 7K',
  }
};

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

/** Describes the state of a form */
export type FormState<T> = {
  /** Denotes if the submission was successful */
  success: boolean;

  /** Seccess / fail detail to display in a toast */
  message: string;

  /** Any errors specific to a form property */
  errors: { [K in keyof T]?: string[]; };
}
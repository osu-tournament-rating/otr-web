import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  TournamentsListRequestParams,
  UserDTO,
} from '@osu-tournament-rating/otr-api-client';

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

export interface SessionData {
  /** User data */
  user?: UserDTO;

  /** Denotes if the user is logged in */
  isLogged: boolean;

  /** API access token */
  accessToken?: string;

  /** API refresh token */
  refreshToken?: string;
}

/** Names of available cookies */
export enum CookieNames {
  /**
   * The Ruleset currently selected by the user in the navbar
   * @deprecated
   */
  SelectedRuleset = 'OTR-selected-ruleset',

  /** XSRF token for osu! OAuth authentication */
  AuthXSRFToken = 'otr-auth-xsrf-token',

  /** Session data */
  Session = 'otr-session',
}

/** Parameters used to get the session as an alternative to using read only cookies */
export type GetSessionParams = {
  req: NextRequest;
  res: NextResponse;
};

/** Describes the state of a form */
export type FormState<T> = {
  /** Denotes if the submission was successful */
  success: boolean;

  /** Success / fail detail to display in a toast */
  message: string;

  /** Any errors specific to a form property */
  errors: { [K in keyof T]?: string[] };
};

/** {@link TournamentsListRequestParams} without the pagination parameters */
export type TournamentListFilter = Omit<
  TournamentsListRequestParams,
  'page' | 'pageSize'
>;

/** Pagination properties for API requests */
export type PaginationProps = { page: number; pageSize: number };

/** Creates a type by picking all properties of U from T */
export type PickByType<T, U> = Pick<
  T,
  { [K in keyof T]: T[K] extends U ? K : never }[keyof T]
>;

/** Types of items in the main structure */
export type ApiItemType = 'tournament' | 'match' | 'game' | 'score';

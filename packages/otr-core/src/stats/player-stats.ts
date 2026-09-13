import { z } from 'zod';

import { Mods, Ruleset } from '../osu/enums';

/** Rulesets with their own snapshot; `ManiaOther` has no public leaderboard. */
export const PLAYER_STATS_RULESETS = [
  Ruleset.Osu,
  Ruleset.Taiko,
  Ruleset.Catch,
  Ruleset.Mania4k,
  Ruleset.Mania7k,
] as const;

/** Mod specialist chips per ruleset in display order; an empty list omits the card. */
export const PLAYER_STATS_MODS: Record<Ruleset, readonly Mods[]> = {
  [Ruleset.Osu]: [Mods.Easy, Mods.HardRock, Mods.Hidden, Mods.DoubleTime],
  [Ruleset.Taiko]: [Mods.HardRock, Mods.Hidden, Mods.DoubleTime],
  [Ruleset.Catch]: [Mods.Hidden, Mods.DoubleTime, Mods.HardRock],
  [Ruleset.ManiaOther]: [],
  [Ruleset.Mania4k]: [],
  [Ruleset.Mania7k]: [],
};

export const PLAYER_STATS_MILESTONES = [
  10, 25, 50, 100, 250, 500, 1000,
] as const;

/** Upset windows in months before the snapshot time; `all` is unbounded. */
export const PLAYER_STATS_UPSET_WINDOWS = ['all', '3', '6', '12'] as const;

/** First place rate cohorts by tournament lobby size; `all` is every size. */
export const PLAYER_STATS_TEAM_SIZES = ['all', '1', '2', '3', '4'] as const;

export const PLAYER_STATS_WINDOWS = {
  recentDays: 30,
  activeMonths: 6,
} as const;

export const PLAYER_STATS_FIRST_PLACE_MINIMUM = {
  matches: 10,
  games: 35,
} as const;

/** Rows stored per list; the page shows the head and pages the rest client-side. */
export const PLAYER_STATS_LIMITS = {
  leaders: 3,
  duos: 250,
  upsets: 50,
  firstPlace: 50,
  active: 50,
  milestones: 250,
  newcomers: 250,
} as const;

export const PLAYER_STATS_REFRESH_MINUTES = 60;

const isoTimestamp = z.string().datetime({ offset: true });

/** A player as shown in a list row; `rating` is the current rating in the snapshot's ruleset. */
export const PlayerStatsPlayerSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  username: z.string(),
  country: z.string(),
  rating: z.number().nullable(),
});

export const PlayerStatsLeaderSchema = PlayerStatsPlayerSchema.extend({
  value: z.number().int().nonnegative(),
});

export const PlayerStatsModLeadersSchema = z.object({
  mods: z.number().int(),
  leaders: z.array(PlayerStatsLeaderSchema),
});

export const PlayerStatsDuoSchema = z.object({
  players: z.tuple([PlayerStatsPlayerSchema, PlayerStatsPlayerSchema]),
  games: z.number().int().positive(),
  matches: z.number().int().positive(),
  tournaments: z.number().int().positive(),
  firstGame: isoTimestamp,
  lastGame: isoTimestamp,
});

export const PlayerStatsUpsetPlayerSchema = PlayerStatsPlayerSchema.extend({
  ratingBefore: z.number(),
});

export const PlayerStatsUpsetSchema = z.object({
  matchId: z.number().int(),
  tournament: z.object({
    id: z.number().int(),
    name: z.string(),
    abbreviation: z.string(),
  }),
  date: isoTimestamp,
  winner: PlayerStatsUpsetPlayerSchema,
  loser: PlayerStatsUpsetPlayerSchema,
  gap: z.number().positive(),
});

export const PlayerStatsFirstPlaceSchema = PlayerStatsPlayerSchema.extend({
  wins: z.number().int().nonnegative(),
  games: z.number().int().positive(),
});

export const PlayerStatsActiveSchema = PlayerStatsPlayerSchema.extend({
  matches: z.number().int().positive(),
  tournaments: z.number().int().positive(),
});

export const PlayerStatsMilestoneKindSchema = z.enum([
  'tournaments',
  'matches',
  'games',
]);

export const PlayerStatsMilestoneSchema = PlayerStatsPlayerSchema.extend({
  kind: PlayerStatsMilestoneKindSchema,
  count: z.number().int().positive(),
  date: isoTimestamp,
  matchId: z.number().int(),
});

export const PlayerStatsNewcomerSchema = PlayerStatsPlayerSchema.extend({
  firstMatch: isoTimestamp,
  matchId: z.number().int(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  osuGlobalRank: z.number().int().nullable(),
});

export const PlayerStatsParticipationSchema = z.object({
  /** UTC month as `YYYY-MM`. */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  players: z.number().int().nonnegative(),
});

/** The stored per-ruleset snapshot; every list is sorted for display. */
export const PlayerStatsSchema = z.object({
  leaders: z.object({
    tournaments: z.array(PlayerStatsLeaderSchema),
    matches: z.array(PlayerStatsLeaderSchema),
    games: z.array(PlayerStatsLeaderSchema),
  }),
  mods: z.array(PlayerStatsModLeadersSchema),
  duos: z.array(PlayerStatsDuoSchema),
  upsets: z.record(
    z.enum(PLAYER_STATS_UPSET_WINDOWS),
    z.array(PlayerStatsUpsetSchema)
  ),
  firstPlace: z.record(
    z.enum(PLAYER_STATS_TEAM_SIZES),
    z.array(PlayerStatsFirstPlaceSchema)
  ),
  active: z.array(PlayerStatsActiveSchema),
  milestones: z.array(PlayerStatsMilestoneSchema),
  newcomers: z.array(PlayerStatsNewcomerSchema),
  participation: z.array(PlayerStatsParticipationSchema),
});

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type PlayerStatsPlayer = z.infer<typeof PlayerStatsPlayerSchema>;
export type PlayerStatsLeader = z.infer<typeof PlayerStatsLeaderSchema>;
export type PlayerStatsDuo = z.infer<typeof PlayerStatsDuoSchema>;
export type PlayerStatsUpset = z.infer<typeof PlayerStatsUpsetSchema>;
export type PlayerStatsFirstPlace = z.infer<typeof PlayerStatsFirstPlaceSchema>;
export type PlayerStatsActive = z.infer<typeof PlayerStatsActiveSchema>;
export type PlayerStatsMilestone = z.infer<typeof PlayerStatsMilestoneSchema>;
export type PlayerStatsNewcomer = z.infer<typeof PlayerStatsNewcomerSchema>;
export type PlayerStatsUpsetWindow =
  (typeof PLAYER_STATS_UPSET_WINDOWS)[number];
export type PlayerStatsTeamSize = (typeof PLAYER_STATS_TEAM_SIZES)[number];

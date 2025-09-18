import { z } from 'zod';

import { BeatmapSchema } from './beatmap';

export const GameSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  matchId: z.number().int(),
  beatmapId: z.number().int().nullable(),
  ruleset: z.number().int(),
  scoringType: z.number().int(),
  teamType: z.number().int(),
  mods: z.number().int(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  warningFlags: z.number().int(),
  playMode: z.number().int(),
  beatmap: BeatmapSchema.nullable(),
});

export const MatchSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  tournamentId: z.number().int(),
  name: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  warningFlags: z.number().int(),
  submittedByUserId: z.number().int().nullable(),
  verifiedByUserId: z.number().int().nullable(),
  dataFetchStatus: z.number().int(),
  games: GameSchema.array(),
});

export type Game = z.infer<typeof GameSchema>;
export type Match = z.infer<typeof MatchSchema>;

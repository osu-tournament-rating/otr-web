import { z } from 'zod';

export const PlayerSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  username: z.string(),
  country: z.string(),
  defaultRuleset: z.number().int(),
  osuLastFetch: z.string(),
  osuTrackLastFetch: z.string(),
  userId: z.number().int().nullable().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

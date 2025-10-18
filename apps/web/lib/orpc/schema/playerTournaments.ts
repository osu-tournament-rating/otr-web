import { z } from 'zod/v4';
import { RulesetSchema } from './constants';

export const PlayerTournamentsRequestSchema = z.object({
  id: z.number().int().positive(),
  ruleset: RulesetSchema.optional(),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
});

export type PlayerTournamentsRequest = z.infer<
  typeof PlayerTournamentsRequestSchema
>;

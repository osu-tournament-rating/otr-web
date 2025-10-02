import { z } from 'zod/v4';
import { RulesetSchema } from './constants';

export const PlayerTournamentsRequestSchema = z.object({
  key: z.string().min(1),
  ruleset: RulesetSchema.optional(),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
});

export type PlayerTournamentsRequest = z.infer<
  typeof PlayerTournamentsRequestSchema
>;

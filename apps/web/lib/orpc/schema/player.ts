import { z } from 'zod/v4';

import { playerSelectSchema } from './base';
import { CreatedUpdatedOmit, RulesetSchema } from './constants';

export const PlayerSchema = playerSelectSchema.omit(CreatedUpdatedOmit).extend({
  defaultRuleset: RulesetSchema,
  userId: z.number().int().nullable().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

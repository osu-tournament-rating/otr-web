import { users } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { CreatedUpdatedOmit } from './common';

export const UserSchema = createSelectSchema(users).omit(CreatedUpdatedOmit);

export const CurrentUserSchema = z.object({
  player: z.object({
    id: z.number().int(),
    username: z.string(),
    osuId: z.number().int(),
    country: z.string(),
  }),
  scopes: z.array(z.string()),
  userId: z.number().int().nullable(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

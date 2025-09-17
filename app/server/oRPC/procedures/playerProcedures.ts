import { ORPCError } from '@orpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import * as schema from '@/lib/db/schema';

import { publicProcedure } from './base';

export const getPlayer = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .handler(async ({ input, context }) => {
    const player = await context.db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, input.id))
      .limit(1);

    if (!player[0]) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Player not found',
      });
    }

    return player[0];
  });

import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '../db';
import * as schema from '@otr/core/db/schema';

type DbExecutor = Pick<DatabaseClient, 'query' | 'insert' | 'update'>;

export const getOrCreatePlayerId = async (
  db: DbExecutor,
  osuPlayerId: number,
  overrides?: { username?: string; country?: string }
): Promise<number> => {
  const existing = await db.query.players.findFirst({
    where: eq(schema.players.osuId, osuPlayerId),
    columns: {
      id: true,
    },
  });

  if (existing) {
    if (overrides?.username || overrides?.country) {
      await db
        .update(schema.players)
        .set({
          ...(overrides.username ? { username: overrides.username } : {}),
          ...(overrides.country ? { country: overrides.country } : {}),
        })
        .where(eq(schema.players.id, existing.id));
    }

    return existing.id;
  }

  const [inserted] = await db
    .insert(schema.players)
    .values({
      osuId: osuPlayerId,
      username: overrides?.username ?? '',
      country: overrides?.country ?? '',
    })
    .returning({ id: schema.players.id });

  if (!inserted) {
    throw new Error('Failed to create player record');
  }

  return inserted.id;
};

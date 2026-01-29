import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '../db';
import * as schema from '@otr/core/db/schema';

type DbExecutor = Pick<DatabaseClient, 'query' | 'insert' | 'update'>;
type UpdateExecutor = Pick<DatabaseClient, 'update'>;
type QueryExecutor = Pick<DatabaseClient, 'query'>;

export interface PlayerRecord {
  id: number;
  dataFetchStatus: number;
}

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

export const ensurePlayerPlaceholder = async (
  db: DbExecutor,
  osuPlayerId: number,
  status: number,
  updatedIso: string
): Promise<PlayerRecord> => {
  const existing = await db.query.players.findFirst({
    where: eq(schema.players.osuId, osuPlayerId),
    columns: {
      id: true,
      dataFetchStatus: true,
    },
  });

  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(schema.players)
    .values({
      osuId: osuPlayerId,
      dataFetchStatus: status,
      updated: updatedIso,
    })
    .onConflictDoNothing()
    .returning({
      id: schema.players.id,
      dataFetchStatus: schema.players.dataFetchStatus,
    });

  if (inserted) {
    return inserted;
  }

  const fallback = await db.query.players.findFirst({
    where: eq(schema.players.osuId, osuPlayerId),
    columns: {
      id: true,
      dataFetchStatus: true,
    },
  });

  if (!fallback) {
    throw new Error('Failed to upsert player placeholder');
  }

  return fallback;
};

export const updatePlayerStatus = async (
  db: UpdateExecutor,
  playerId: number,
  status: number,
  updatedIso: string
) => {
  await db
    .update(schema.players)
    .set({
      dataFetchStatus: status,
      osuLastFetch: updatedIso,
      updated: updatedIso,
    })
    .where(eq(schema.players.id, playerId));
};

export const getPlayerFetchStatus = async (
  db: QueryExecutor,
  osuPlayerId: number
): Promise<number | null> => {
  const player = await db.query.players.findFirst({
    where: eq(schema.players.osuId, osuPlayerId),
    columns: {
      dataFetchStatus: true,
    },
  });

  return player?.dataFetchStatus ?? null;
};

export const setPlayerFetchStatusByOsuId = async (
  db: UpdateExecutor,
  osuPlayerId: number,
  status: number,
  updatedIso: string
) => {
  await db
    .update(schema.players)
    .set({
      dataFetchStatus: status,
      updated: updatedIso,
    })
    .where(eq(schema.players.osuId, osuPlayerId));
};

export const setPlayerOsuTrackFetchStatusByOsuId = async (
  db: UpdateExecutor,
  osuPlayerId: number,
  status: number,
  updatedIso: string
) => {
  await db
    .update(schema.players)
    .set({
      osuTrackDataFetchStatus: status,
      updated: updatedIso,
    })
    .where(eq(schema.players.osuId, osuPlayerId));
};

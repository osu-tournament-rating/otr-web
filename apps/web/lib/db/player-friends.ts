import { db } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function getFriendCount(playerId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.playerFriends)
    .where(eq(schema.playerFriends.playerId, playerId));
  return result[0]?.count ?? 0;
}

export async function hasFriends(playerId: number): Promise<boolean> {
  const count = await getFriendCount(playerId);
  return count > 0;
}

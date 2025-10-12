import { db } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import { eq, ilike } from 'drizzle-orm';

const isStrictNumeric = (value: string): boolean => /^[0-9]+$/.test(value);
const normaliseKey = (value: string): string => value.trim();

export async function resolvePlayerIdFromKey(
  key: string
): Promise<number | null> {
  const trimmed = normaliseKey(key);
  if (!trimmed) return null;

  if (isStrictNumeric(trimmed)) {
    const numericKey = Number(trimmed);

    // Try internal id first
    const byId = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(eq(schema.players.id, numericKey))
      .limit(1);
    if (byId[0]?.id) return byId[0].id;

    // Then osu! id
    const byOsuId = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(eq(schema.players.osuId, numericKey))
      .limit(1);
    if (byOsuId[0]?.id) return byOsuId[0].id;
  }

  // Fallback to username (case-insensitive)
  const byUsername = await db
    .select({ id: schema.players.id })
    .from(schema.players)
    .where(ilike(schema.players.username, trimmed))
    .limit(1);
  if (byUsername[0]?.id) return byUsername[0].id;

  return null;
}

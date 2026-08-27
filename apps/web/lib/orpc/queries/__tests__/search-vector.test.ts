import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { buildTrigramPrecision, parseSearchTerm } from '../search';

// Seeds and deletes rows; point it at a disposable database
const url = process.env.SEARCH_TEST_DATABASE_URL;

const OSU_ID = 999_100_001;

describe.skipIf(!url)('player search over the migrated schema', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    await db.delete(schema.players).where(eq(schema.players.osuId, OSU_ID));
    await db
      .insert(schema.players)
      .values({ osuId: OSU_ID, username: 'hotdog2000' });
  });

  afterAll(async () => {
    await db.delete(schema.players).where(eq(schema.players.osuId, OSU_ID));
    await pool.end();
  });

  it('finds a seeded player by full-text and trigram match', async () => {
    const parsed = parseSearchTerm('hotdog2000')!;

    const rows = await db
      .select({ username: schema.players.username })
      .from(schema.players)
      .where(
        and(
          eq(schema.players.osuId, OSU_ID),
          sql`${schema.players.searchVector} @@ ${parsed.tsQuery}`,
          buildTrigramPrecision([schema.players.username], parsed)
        )
      );

    expect(rows).toEqual([{ username: 'hotdog2000' }]);
  });
});

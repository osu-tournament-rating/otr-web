import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { asc, desc, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { buildPlayerSearchExpressions, parseSearchTerm } from '../search';

// Seeds and deletes rows, so it only runs against a database you nominate as
// disposable. `bun test` in CI has no Postgres and skips.
const url = process.env.SEARCH_TEST_DATABASE_URL;

const CURRENT_HOLDER_OSU_ID = 999_000_001;
const FORMER_HOLDER_OSU_ID = 999_000_002;
const osuIds = [CURRENT_HOLDER_OSU_ID, FORMER_HOLDER_OSU_ID];

describe.skipIf(!url)('player search over previous usernames', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const search = async (term: string) => {
    const parsed = parseSearchTerm(term)!;
    const { condition, rank, matchedPreviousUsername } =
      buildPlayerSearchExpressions(parsed);

    return db
      .select({
        username: schema.players.username,
        rank,
        matchedPreviousUsername,
      })
      .from(schema.players)
      .where(condition)
      .orderBy(desc(rank), asc(schema.players.username));
  };

  beforeAll(async () => {
    await db
      .delete(schema.players)
      .where(inArray(schema.players.osuId, osuIds));
    await db.insert(schema.players).values([
      {
        osuId: CURRENT_HOLDER_OSU_ID,
        username: 'hotdog2000',
        previousUsernames: [],
      },
      {
        osuId: FORMER_HOLDER_OSU_ID,
        username: 'apricot',
        previousUsernames: ['hotdog2000', 'burgerking'],
      },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(schema.players)
      .where(inArray(schema.players.osuId, osuIds));
    await pool.end();
  });

  it('finds a player by a username they no longer hold', async () => {
    const rows = await search('burgerking');

    expect(rows).toMatchObject([
      { username: 'apricot', matchedPreviousUsername: 'burgerking' },
    ]);
  });

  it('ranks the current holder of a username above a former holder', async () => {
    const rows = await search('hotdog2000');

    // `apricot` sorts first alphabetically, so only the rank can order these
    expect(rows.map((row) => row.username)).toEqual(['hotdog2000', 'apricot']);
    expect(Number(rows[0]?.rank)).toBeGreaterThan(Number(rows[1]?.rank));
    expect(rows[0]?.matchedPreviousUsername).toBeNull();
    expect(rows[1]?.matchedPreviousUsername).toBe('hotdog2000');
  });
});

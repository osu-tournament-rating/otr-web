import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, asc, desc, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { buildPlayerSearchExpressions, parseSearchTerm } from '../search';

// Seeds and deletes rows; point it at a disposable database
const url = process.env.SEARCH_TEST_DATABASE_URL;

const CURRENT_HOLDER_OSU_ID = 999_000_001;
const FORMER_HOLDER_OSU_ID = 999_000_002;
const PREFIX_HOLDER_OSU_ID = 999_000_003;
const MANY_FORMER_NAMES_OSU_ID = 999_000_004;
const TWO_FORMER_NAMES_OSU_ID = 999_000_005;
const osuIds = [
  CURRENT_HOLDER_OSU_ID,
  FORMER_HOLDER_OSU_ID,
  PREFIX_HOLDER_OSU_ID,
  MANY_FORMER_NAMES_OSU_ID,
  TWO_FORMER_NAMES_OSU_ID,
];

describe.skipIf(!url)('player search over previous usernames', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const search = async (term: string) => {
    const parsed = parseSearchTerm(term)!;
    const { condition, rank, currentUsernameMatched, matchedPreviousUsername } =
      buildPlayerSearchExpressions(parsed);

    return db
      .select({
        username: schema.players.username,
        rank,
        matchedPreviousUsername,
      })
      .from(schema.players)
      .where(and(condition, inArray(schema.players.osuId, osuIds)))
      .orderBy(
        desc(currentUsernameMatched),
        desc(rank),
        asc(schema.players.username)
      );
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
      {
        osuId: PREFIX_HOLDER_OSU_ID,
        username: 'Aoi',
        previousUsernames: [],
      },
      {
        osuId: MANY_FORMER_NAMES_OSU_ID,
        username: 'renamer3',
        previousUsernames: ['Aoba', 'Aozora', 'Aomine'],
      },
      {
        osuId: TWO_FORMER_NAMES_OSU_ID,
        username: 'Cookiezi',
        previousUsernames: ['Rafis', 'Shigetora'],
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
    expect(rows[0]?.matchedPreviousUsername).toBeNull();
    expect(rows[1]?.matchedPreviousUsername).toBe('hotdog2000');
  });

  it('ranks a current username above several matching former names', async () => {
    const rows = await search('ao');

    expect(rows.map((row) => row.username)).toEqual(['Aoi', 'renamer3']);
    expect(rows[0]?.matchedPreviousUsername).toBeNull();
    expect(Number(rows[1]?.rank)).toBeGreaterThan(Number(rows[0]?.rank));
  });

  it('discloses former names when the query spans two of them', async () => {
    const rows = await search('rafis shigetora');

    expect(rows).toMatchObject([
      { username: 'Cookiezi', matchedPreviousUsername: 'Rafis, Shigetora' },
    ]);
  });
});

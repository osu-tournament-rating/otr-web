import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import {
  Ruleset,
  TournamentQuerySortType,
  VerificationStatus,
} from '@otr/core/osu';
import {
  buildTournamentSearchExpressions,
  parseSearchTerm,
} from '@/lib/orpc/queries/search';

import { buildHeaderSearchTournamentOrder } from '../searchProcedures';
import { buildTournamentListQuery } from '../tournamentsProcedures';

// Seeds and deletes rows; point it at a disposable database
const url = process.env.SEARCH_TEST_DATABASE_URL;

// In the expected order for the term 'zzrc'
const seeds = [
  ['verified exact abbreviation', 'Zz Relevance Championship', 'ZZRC', true],
  ['verified exact name', 'ZZRC', 'ZR', true],
  ['verified abbreviation prefix', 'Zz Relevance Cup 2025', 'ZZRC2025', true],
  ['verified name prefix', 'ZZRC but for noobs (Noob ZZRC)', 'NZZRC', true],
  ['verified name substring', 'Noob ZZRC Cup', 'NZC', true],
  ['rejected exact abbreviation', 'Zz Relevance Clash', 'ZZRC', false],
  ['rejected abbreviation substring', 'Zz Extra Cup', 'XZZRCX', false],
] as const;

describe.skipIf(!url)('tournament relevance order', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const labels = new Map<number, string>();

  const remove = () =>
    db.delete(schema.tournaments).where(
      inArray(
        schema.tournaments.name,
        seeds.map(([, name]) => name)
      )
    );

  const labelRows = (rows: { id: number }[]) =>
    rows.map((row) => labels.get(row.id));

  beforeAll(async () => {
    await remove();
    const rows = await db
      .insert(schema.tournaments)
      .values(
        seeds.map(([, name, abbreviation, verified], index) => ({
          name,
          abbreviation,
          forumUrl: `https://osu.ppy.sh/community/forums/topics/${index}`,
          rankRangeLowerBound: 1,
          ruleset: Ruleset.Osu,
          lobbySize: 4,
          verificationStatus: verified
            ? VerificationStatus.Verified
            : VerificationStatus.Rejected,
          // Oldest first, so the newest-submission tie-break alone would
          // reverse the expected order
          created: new Date(Date.UTC(2020, 0, 1 + index)).toISOString(),
        }))
      )
      .returning({ id: schema.tournaments.id, name: schema.tournaments.name });

    for (const [label, name] of seeds) {
      labels.set(rows.find((row) => row.name === name)!.id, label);
    }
  });

  afterAll(async () => {
    await remove();
    await pool.end();
  });

  it('ranks verified tournaments first, then exact, prefix, and substring matches', async () => {
    const { whereClause, orderBy } = buildTournamentListQuery({
      page: 1,
      pageSize: 30,
      searchQuery: 'zzrc',
      sort: TournamentQuerySortType.SearchQueryRelevance,
    });
    const rows = await db
      .select({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .where(
        and(whereClause, inArray(schema.tournaments.id, [...labels.keys()]))
      )
      .orderBy(...orderBy);

    expect(labelRows(rows)).toEqual(seeds.map(([label]) => label));
  });

  it('orders the header search the same way', async () => {
    const term = 'zzrc';
    const { condition, rank } = buildTournamentSearchExpressions(
      parseSearchTerm(term)!
    );
    const rows = await db
      .select({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .where(and(condition, inArray(schema.tournaments.id, [...labels.keys()])))
      .orderBy(...buildHeaderSearchTournamentOrder(term, rank));

    // Its full-text match doesn't look inside a word, so it skips 'XZZRCX'
    expect(labelRows(rows)).toEqual(
      seeds
        .map(([label]) => label)
        .filter((label) => label !== 'rejected abbreviation substring')
    );
  });
});

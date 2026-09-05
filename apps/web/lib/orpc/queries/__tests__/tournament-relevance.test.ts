import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, desc, ilike, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { Ruleset, VerificationStatus } from '@otr/core/osu';
import {
  buildTournamentRelevanceOrder,
  buildTournamentSearchExpressions,
  parseSearchTerm,
} from '../search';

// Point at a disposable database
const url = process.env.SEARCH_TEST_DATABASE_URL;

const seeds = [
  ['verified exact', 'Zz Relevance Championship', 'ZZRC', true],
  ['verified prefix', 'zz! Relevance Cup 2025', 'ZZRC2025', true],
  ['rejected exact', 'Zz Relevance Clash', 'ZZRC', false],
  ['rejected abbreviation prefix', 'Zz Random Cup', 'ZZRCX', false],
  ['rejected name prefix', 'ZZRC but for noobs (Noob ZZRC)', 'NZZRC', false],
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
          // Older rows first so the tiebreak works against the expected order.
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

  // Mirrors the filter and tiebreak in the tournament list procedure.
  const search = async (term: string) => {
    const substring = `%${term}%`;
    const rows = await db
      .select({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .where(
        and(
          inArray(schema.tournaments.id, [...labels.keys()]),
          or(
            ilike(schema.tournaments.name, substring),
            ilike(schema.tournaments.abbreviation, substring)
          )
        )
      )
      .orderBy(
        ...buildTournamentRelevanceOrder(term),
        desc(schema.tournaments.created)
      );
    return rows.map((row) => labels.get(row.id));
  };

  // Mirrors the tournament query in the site-wide search procedure.
  const siteSearch = async (term: string) => {
    const { condition, order } = buildTournamentSearchExpressions(
      parseSearchTerm(term)!,
      term
    );
    const rows = await db
      .select({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .where(and(inArray(schema.tournaments.id, [...labels.keys()]), condition))
      .orderBy(...order);
    return rows.map((row) => labels.get(row.id));
  };

  it('orders the site-wide search like the list', async () => {
    expect(await siteSearch('zzrc')).toEqual([
      'verified exact',
      'verified prefix',
      'rejected exact',
      'rejected abbreviation prefix',
      'rejected name prefix',
    ]);
  });

  it('ranks verified tournaments first, then exact, prefix, and substring matches', async () => {
    expect(await search('zzrc')).toEqual([
      'verified exact',
      'verified prefix',
      'rejected exact',
      'rejected abbreviation prefix',
      'rejected name prefix',
    ]);
  });
});

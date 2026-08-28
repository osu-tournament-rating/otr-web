import { describe, expect, it } from 'bun:test';
import { Column, Param, SQL, StringChunk, getTableColumns } from 'drizzle-orm';

import {
  acceptTournamentPreVerificationStatusesHandler,
  type AcceptPreVerificationStatusesArgs,
} from '../adminProcedures';
import * as schema from '@otr/core/db/schema';
import {
  GameRejectionReason,
  MatchRejectionReason,
  ScoreRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';
import type { DatabaseClient } from '@/lib/db';

type Row = Record<string, unknown>;

const tables = [
  schema.tournaments,
  schema.matches,
  schema.games,
  schema.gameScores,
];

const columnKeys = new Map<Column, string>();

for (const table of tables) {
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    columnKeys.set(column as Column, key);
  }
}

const keyOf = (column: Column) => {
  const key = columnKeys.get(column);

  if (!key) {
    throw new Error(`Unmapped column ${String(column.name)}`);
  }

  return key;
};

const chunkText = (chunk: unknown) =>
  chunk instanceof StringChunk ? chunk.value.join('') : '';

const operand = (chunk: unknown, row: Row): unknown => {
  if (chunk instanceof Column) {
    return row[keyOf(chunk)];
  }

  if (chunk instanceof Param) {
    return chunk.value;
  }

  if (Array.isArray(chunk)) {
    return chunk.map((entry) => operand(entry, row));
  }

  return chunk;
};

const matches = (condition: SQL, row: Row): boolean => {
  const chunks = condition.queryChunks;
  const nested = chunks.filter((chunk): chunk is SQL => chunk instanceof SQL);

  if (nested.length > 0) {
    const text = chunks.map(chunkText).join('');
    const results = nested.map((chunk) => matches(chunk, row));

    return text.includes(' or ')
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  const operator = chunks.map(chunkText).join('').trim();
  const [left, right] = chunks.filter(
    (chunk) => !(chunk instanceof StringChunk)
  );

  const value = operand(left, row);
  const other = operand(right, row);

  if (operator === '=') {
    return value === other;
  }

  if (operator === 'in') {
    return (other as unknown[]).includes(value);
  }

  throw new Error(`Unsupported operator ${operator}`);
};

const evaluate = (value: unknown, row: Row): unknown => {
  if (!(value instanceof SQL)) {
    return value;
  }

  const chunks = value.queryChunks;
  const operator = chunks.map(chunkText).join('').trim();
  const operands = chunks.filter((chunk) => !(chunk instanceof StringChunk));

  if (operator === '|') {
    return (
      (operand(operands[0], row) as number) |
      (operand(operands[1], row) as number)
    );
  }

  return operator;
};

class FakeDb {
  constructor(private readonly rows: Map<unknown, Row[]>) {}

  private rowsFor(table: unknown) {
    const rows = this.rows.get(table);

    if (!rows) {
      throw new Error('Unsupported table');
    }

    return rows;
  }

  async execute() {}

  async transaction<T>(callback: (tx: FakeDb) => Promise<T>): Promise<T> {
    return callback(this);
  }

  select(fields: Record<string, Column>) {
    return {
      from: (table: unknown) => ({
        where: async (condition: SQL) =>
          this.rowsFor(table)
            .filter((row) => matches(condition, row))
            .map((row) =>
              Object.fromEntries(
                Object.entries(fields).map(([key, column]) => [
                  key,
                  row[keyOf(column)],
                ])
              )
            ),
      }),
    };
  }

  update(table: unknown) {
    return {
      set: (values: Row) => ({
        where: (condition: SQL) => {
          const affected = this.rowsFor(table).filter((row) =>
            matches(condition, row)
          );

          for (const row of affected) {
            for (const [key, value] of Object.entries(values)) {
              row[key] = evaluate(value, row);
            }
          }

          const result = affected.map((row) => ({ id: row.id as number }));

          return {
            then: (resolve: (value: unknown) => unknown) => resolve(result),
            returning: async () => result,
          };
        },
      }),
    };
  }
}

const { None, PreRejected, PreVerified, Rejected, Verified } =
  VerificationStatus;

const allStatuses = [None, PreRejected, PreVerified, Rejected, Verified];

const tournamentOutcome = {
  [None]: None,
  [PreRejected]: Rejected,
  [PreVerified]: Verified,
  [Rejected]: Rejected,
  [Verified]: Verified,
};

// rows: accepted parent status, columns: child status, both ordered None,
// pre-rejected, pre-verified, rejected, verified.
const childOutcome = [
  [None, Rejected, Verified, Rejected, Verified],
  [Rejected, Rejected, Rejected, Rejected, Rejected],
  [None, Rejected, Verified, Rejected, Verified],
  [Rejected, Rejected, Rejected, Rejected, Rejected],
  [None, Rejected, Verified, Rejected, Verified],
];

const adminUserId = 7;

const buildFixture = (tournamentStatus: VerificationStatus) => {
  const tournament: Row = {
    id: 1,
    verificationStatus: tournamentStatus,
    rejectionReason: 0,
    verifiedByUserId: null,
  };

  const matchRows: Row[] = [];
  const gameRows: Row[] = [];
  const scoreRows: Row[] = [];

  let matchId = 0;
  let gameId = 0;
  let scoreId = 0;

  for (const matchStatus of allStatuses) {
    matchId += 1;
    matchRows.push({
      id: matchId,
      tournamentId: 1,
      verificationStatus: matchStatus,
      rejectionReason: 0,
      warningFlags: 0,
      verifiedByUserId: null,
    });

    for (const gameStatus of allStatuses) {
      gameId += 1;
      gameRows.push({
        id: gameId,
        matchId,
        verificationStatus: gameStatus,
        rejectionReason: 0,
        warningFlags: 0,
      });

      for (const scoreStatus of allStatuses) {
        scoreId += 1;
        scoreRows.push({
          id: scoreId,
          gameId,
          verificationStatus: scoreStatus,
          rejectionReason: 0,
        });
      }
    }
  }

  const db = new FakeDb(
    new Map<unknown, Row[]>([
      [schema.tournaments, [tournament]],
      [schema.matches, matchRows],
      [schema.games, gameRows],
      [schema.gameScores, scoreRows],
    ])
  );

  return { db, tournament, matchRows, gameRows, scoreRows };
};

const run = (db: FakeDb) =>
  acceptTournamentPreVerificationStatusesHandler({
    input: { id: 1 },
    context: {
      db: db as unknown as DatabaseClient,
      session: { dbUser: { id: adminUserId, scopes: ['admin'] } },
      adminDataMutationDate: new Date('2026-06-05T12:00:00.000Z'),
    },
  } as AcceptPreVerificationStatusesArgs);

describe('acceptTournamentPreVerificationStatusesHandler', () => {
  for (const tournamentStatus of allStatuses) {
    it(`resolves every descendant of a ${VerificationStatus[tournamentStatus]} tournament`, async () => {
      const fixture = buildFixture(tournamentStatus);
      const startingMatchStatuses = fixture.matchRows.map(
        (row) => row.verificationStatus as VerificationStatus
      );
      const startingGameStatuses = fixture.gameRows.map(
        (row) => row.verificationStatus as VerificationStatus
      );
      const startingScoreStatuses = fixture.scoreRows.map(
        (row) => row.verificationStatus as VerificationStatus
      );

      await run(fixture.db);

      const expectedTournament = tournamentOutcome[tournamentStatus];
      expect(fixture.tournament.verificationStatus).toBe(expectedTournament);

      const matchStatuses = fixture.matchRows.map(
        (row) => row.verificationStatus as VerificationStatus
      );

      fixture.matchRows.forEach((row, index) => {
        const expected =
          childOutcome[expectedTournament][startingMatchStatuses[index]];

        expect(row.verificationStatus).toBe(expected);
        expect(row.rejectionReason).toBe(
          expectedTournament === Rejected
            ? MatchRejectionReason.RejectedTournament
            : 0
        );
      });

      fixture.gameRows.forEach((row, index) => {
        const parent = matchStatuses[(row.matchId as number) - 1];
        const expected = childOutcome[parent][startingGameStatuses[index]];

        expect(row.verificationStatus).toBe(expected);
        expect(row.rejectionReason).toBe(
          parent === Rejected ? GameRejectionReason.RejectedMatch : 0
        );
      });

      const gameStatuses = fixture.gameRows.map(
        (row) => row.verificationStatus as VerificationStatus
      );

      fixture.scoreRows.forEach((row, index) => {
        const parent = gameStatuses[(row.gameId as number) - 1];
        const expected = childOutcome[parent][startingScoreStatuses[index]];

        expect(row.verificationStatus).toBe(expected);
        expect(row.rejectionReason).toBe(
          parent === Rejected ? ScoreRejectionReason.RejectedGame : 0
        );
      });
    });
  }

  it('rejects a pre-verified game under an already rejected match', async () => {
    const fixture = buildFixture(PreVerified);

    await run(fixture.db);

    const game = fixture.gameRows.find(
      (row) => row.matchId === 4 && row.id === 18
    );

    expect(game?.verificationStatus).toBe(Rejected);
    expect(game?.rejectionReason).toBe(GameRejectionReason.RejectedMatch);
  });

  it('rejects a verified score under an already rejected game', async () => {
    const fixture = buildFixture(PreVerified);

    await run(fixture.db);

    const score = fixture.scoreRows.find((row) => row.id === 70);

    expect(score?.gameId).toBe(14);
    expect(score?.verificationStatus).toBe(Rejected);
    expect(score?.rejectionReason).toBe(ScoreRejectionReason.RejectedGame);
  });

  it('records the admin on statuses it accepts', async () => {
    const fixture = buildFixture(PreVerified);

    await run(fixture.db);

    expect(fixture.tournament.verifiedByUserId).toBe(adminUserId);
    expect(fixture.matchRows[1]?.verifiedByUserId).toBe(adminUserId);
    expect(fixture.matchRows[2]?.verifiedByUserId).toBe(adminUserId);
    expect(fixture.matchRows[0]?.verifiedByUserId).toBeNull();
    expect(fixture.matchRows[3]?.verifiedByUserId).toBeNull();
    expect(fixture.matchRows[4]?.verifiedByUserId).toBeNull();
  });
});

import { describe, expect, it } from 'bun:test';

import {
  acceptTournamentPreVerificationStatusesHandler,
  type AcceptTournamentPreVerificationStatusesArgs,
} from '../adminProcedures';
import * as schema from '@otr/core/db/schema';
import { VerificationStatus } from '@otr/core/osu';
import type { DatabaseClient } from '@/lib/db';

const ADMIN_USER_ID = 99;

interface StatusRow {
  id: number;
  verificationStatus: number;
}

interface Statement {
  table: 'tournaments' | 'matches' | 'games' | 'gameScores';
  values: Record<string, unknown>;
}

class AcceptTestDb {
  public readonly statements: Statement[] = [];

  constructor(
    private readonly tournamentStatus: number | null,
    private readonly matches: StatusRow[] = [],
    private readonly games: Array<StatusRow & { matchId: number }> = []
  ) {}

  rowsFor(table: unknown) {
    if (table === schema.tournaments) {
      return this.tournamentStatus === null
        ? []
        : [{ id: 1, verificationStatus: this.tournamentStatus }];
    }

    if (table === schema.matches) {
      return this.matches;
    }

    if (table === schema.games) {
      return this.games;
    }

    return [];
  }

  nameFor(table: unknown): Statement['table'] {
    if (table === schema.tournaments) return 'tournaments';
    if (table === schema.matches) return 'matches';
    if (table === schema.games) return 'games';
    if (table === schema.gameScores) return 'gameScores';
    throw new Error('Unsupported table');
  }

  select() {
    return {
      from: (table: unknown) => ({
        where: async () => this.rowsFor(table),
      }),
    };
  }

  update(table: unknown) {
    return {
      set: (values: Record<string, unknown>) => ({
        where: () => {
          this.statements.push({ table: this.nameFor(table), values });

          return {
            returning: async () =>
              this.rowsFor(table).map((row) => ({ ...row })),
          };
        },
      }),
    };
  }

  async execute(): Promise<void> {}

  async transaction<T>(callback: (tx: AcceptTestDb) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

const createArgs = (
  db: AcceptTestDb
): AcceptTournamentPreVerificationStatusesArgs => ({
  input: { id: 1 },
  context: {
    db: db as unknown as DatabaseClient,
    session: { dbUser: { id: ADMIN_USER_ID, scopes: ['admin'] } },
    adminDataMutationDate: new Date('2026-06-05T12:00:00.000Z'),
  },
});

const statusesFor = (db: AcceptTestDb, table: Statement['table']) =>
  db.statements
    .filter((statement) => statement.table === table)
    .map((statement) => statement.values.verificationStatus);

describe('acceptTournamentPreVerificationStatusesHandler', () => {
  it('rejects every descendant when the tournament resolves to rejected', async () => {
    const db = new AcceptTestDb(
      VerificationStatus.Rejected,
      [{ id: 10, verificationStatus: VerificationStatus.PreVerified }],
      [
        {
          id: 20,
          matchId: 10,
          verificationStatus: VerificationStatus.PreVerified,
        },
      ]
    );

    const result = await acceptTournamentPreVerificationStatusesHandler(
      createArgs(db)
    );

    expect(result.success).toBe(true);
    expect(statusesFor(db, 'matches')).toEqual([VerificationStatus.Rejected]);
    expect(statusesFor(db, 'games')).toEqual([VerificationStatus.Rejected]);
    expect(statusesFor(db, 'gameScores')).toEqual([
      VerificationStatus.Rejected,
    ]);
  });

  it('stamps the tournament and resolves pre-statuses when it is not rejected', async () => {
    const db = new AcceptTestDb(
      VerificationStatus.Verified,
      [{ id: 10, verificationStatus: VerificationStatus.Verified }],
      [
        {
          id: 20,
          matchId: 10,
          verificationStatus: VerificationStatus.Verified,
        },
      ]
    );

    await acceptTournamentPreVerificationStatusesHandler(createArgs(db));

    const tournamentStatements = db.statements.filter(
      (statement) => statement.table === 'tournaments'
    );
    expect(tournamentStatements).toHaveLength(2);
    expect(
      tournamentStatements.every(
        (statement) => statement.values.verifiedByUserId === ADMIN_USER_ID
      )
    ).toBe(true);

    expect(statusesFor(db, 'matches')).toEqual([
      VerificationStatus.Verified,
      VerificationStatus.Rejected,
    ]);
    expect(statusesFor(db, 'games')).toEqual([
      VerificationStatus.Verified,
      VerificationStatus.Rejected,
    ]);
    expect(statusesFor(db, 'gameScores')).toEqual([
      VerificationStatus.Verified,
      VerificationStatus.Rejected,
    ]);
  });

  it('does not promote games under a rejected match', async () => {
    const db = new AcceptTestDb(
      VerificationStatus.None,
      [{ id: 10, verificationStatus: VerificationStatus.Rejected }],
      [
        {
          id: 20,
          matchId: 10,
          verificationStatus: VerificationStatus.PreVerified,
        },
      ]
    );

    await acceptTournamentPreVerificationStatusesHandler(createArgs(db));

    expect(statusesFor(db, 'games')).toEqual([VerificationStatus.Rejected]);
    expect(statusesFor(db, 'gameScores')).toEqual([
      VerificationStatus.Rejected,
    ]);
  });

  it('fails when the tournament is missing', async () => {
    const db = new AcceptTestDb(null);

    await expect(
      acceptTournamentPreVerificationStatusesHandler(createArgs(db))
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

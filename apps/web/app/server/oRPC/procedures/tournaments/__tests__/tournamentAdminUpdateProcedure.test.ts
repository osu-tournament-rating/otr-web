import { describe, expect, it } from 'bun:test';

import {
  updateTournamentAdminHandler,
  type UpdateTournamentAdminArgs,
} from '../adminProcedures';
import * as schema from '@otr/core/db/schema';
import { Ruleset, VerificationStatus } from '@otr/core/osu';
import type { DatabaseClient } from '@/lib/db';

class UpdateTournamentTestDb {
  public readonly matches: Array<{ id: number }>;
  public readonly games: Array<{ id: number; matchId: number }>;
  public readonly tournamentUpdates: Array<Record<string, unknown>> = [];
  public readonly gameUpdates: Array<Record<string, unknown>> = [];
  public readonly gameScoreUpdates: Array<Record<string, unknown>> = [];
  public auditCallCount = 0;

  constructor(
    private readonly existingTournament: {
      id: number;
      verificationStatus: number;
      ruleset: number;
    },
    options: {
      matches: Array<{ id: number }>;
      games: Array<{ id: number; matchId: number }>;
    }
  ) {
    this.matches = options.matches;
    this.games = options.games;
  }

  query = {
    tournaments: {
      findFirst: async () => this.existingTournament,
    },
  } as const;

  async transaction<T>(
    callback: (
      tx: UpdateTournamentTestTransaction
    ) => Promise<T>
  ): Promise<T> {
    const tx = new UpdateTournamentTestTransaction(this);
    return callback(tx);
  }
}

class UpdateTournamentTestTransaction {
  constructor(private readonly parent: UpdateTournamentTestDb) {}

  async execute(): Promise<void> {
    this.parent.auditCallCount += 1;
  }

  select() {
    return {
      from: (table: unknown) => ({
        where: async () => {
          if (table === schema.matches) {
            return this.parent.matches;
          }

          if (table === schema.games) {
            return this.parent.games;
          }

          return [];
        },
      }),
    };
  }

  update(table: unknown) {
    return {
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          if (table === schema.tournaments) {
            this.parent.tournamentUpdates.push(values);
            return;
          }

          if (table === schema.games) {
            this.parent.gameUpdates.push(values);
            return;
          }

          if (table === schema.gameScores) {
            this.parent.gameScoreUpdates.push(values);
            return;
          }

          throw new Error('Unsupported update target');
        },
      }),
    };
  }
}

describe('updateTournamentAdminHandler', () => {
  const baseInput: UpdateTournamentAdminArgs['input'] = {
    id: 1,
    name: 'Test Tournament',
    abbreviation: 'TT',
    forumUrl: 'https://osu.ppy.sh/community/forums/topics/1',
    rankRangeLowerBound: 1,
    ruleset: Ruleset.Mania4k,
    lobbySize: 2,
    verificationStatus: VerificationStatus.None,
    rejectionReason: 0,
    startTime: null,
    endTime: null,
  };

  const adminSession: NonNullable<
    UpdateTournamentAdminArgs['context']['session']
  > = {
    dbUser: {
      id: 99,
      scopes: ['admin'],
    },
  };

  const createContext = (
    existingRuleset: Ruleset,
    nextRuleset: Ruleset
  ): UpdateTournamentAdminArgs => {
    const db = new UpdateTournamentTestDb(
      {
        id: 1,
        verificationStatus: VerificationStatus.None,
        ruleset: existingRuleset,
      },
      {
        matches: [{ id: 10 }],
        games: [{ id: 20, matchId: 10 }],
      }
    );

    return {
      input: { ...baseInput, ruleset: nextRuleset },
      context: {
        db: db as unknown as DatabaseClient,
        session: adminSession,
      },
    };
  };

  it('propagates mania variants to games and scores when switching from mania other', async () => {
    const args = createContext(Ruleset.ManiaOther, Ruleset.Mania7k);
    const db = args.context.db as unknown as UpdateTournamentTestDb;

    const result = await updateTournamentAdminHandler(args);

    expect(result.success).toBe(true);
    expect(db.gameUpdates).toHaveLength(1);
    expect(db.gameUpdates[0]).toEqual(
      expect.objectContaining({
        ruleset: Ruleset.Mania7k,
      })
    );
    expect(db.gameScoreUpdates).toHaveLength(1);
    expect(db.gameScoreUpdates[0]).toEqual(
      expect.objectContaining({ ruleset: Ruleset.Mania7k })
    );
  });

  it('does not propagate when the original ruleset is not mania other', async () => {
    const args = createContext(Ruleset.Mania4k, Ruleset.Mania7k);
    const db = args.context.db as unknown as UpdateTournamentTestDb;

    const result = await updateTournamentAdminHandler(args);

    expect(result.success).toBe(true);
    expect(db.gameUpdates).toHaveLength(0);
    expect(db.gameScoreUpdates).toHaveLength(0);
  });
});

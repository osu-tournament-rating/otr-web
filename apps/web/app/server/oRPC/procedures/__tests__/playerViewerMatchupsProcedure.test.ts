import { describe, expect, it } from 'bun:test';

import { computeViewerMatchups } from '../playerProcedures';
import type { DatabaseClient } from '@/lib/db';
import { Ruleset } from '@otr/core/osu';

type PlayerRow = {
  id: number;
  defaultRuleset: Ruleset;
};

type AggregateRow = {
  matchesWith: number;
  matchesAgainst: number;
};

/**
 * Minimal database double for computeViewerMatchups. Records how many times the
 * aggregate query is executed so tests can assert the no-query fast paths.
 */
class ViewerMatchupsTestDb {
  public aggregateCallCount = 0;

  constructor(
    private readonly player: PlayerRow | null,
    private readonly aggregate: AggregateRow | undefined
  ) {}

  query = {
    players: {
      findFirst: async () => this.player,
    },
  } as const;

  select() {
    return {
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: async () => {
              this.aggregateCallCount += 1;
              return this.aggregate === undefined ? [] : [this.aggregate];
            },
          }),
        }),
      }),
    };
  }
}

const PROFILE_PLAYER_ID = 42;

const makeDb = (
  player: PlayerRow | null,
  aggregate: AggregateRow | undefined
) => new ViewerMatchupsTestDb(player, aggregate);

describe('computeViewerMatchups', () => {
  it('returns zeros and runs no aggregate query when there is no session', async () => {
    const db = makeDb(
      { id: PROFILE_PLAYER_ID, defaultRuleset: Ruleset.Osu },
      { matchesWith: 5, matchesAgainst: 9 }
    );

    const result = await computeViewerMatchups({
      db: db as unknown as DatabaseClient,
      viewerPlayerId: null,
      id: PROFILE_PLAYER_ID,
      keyType: 'otr',
    });

    expect(result).toEqual({ matchesWith: 0, matchesAgainst: 0 });
    expect(db.aggregateCallCount).toBe(0);
  });

  it('returns zeros and runs no aggregate query when viewer is the profile player', async () => {
    const db = makeDb(
      { id: PROFILE_PLAYER_ID, defaultRuleset: Ruleset.Osu },
      { matchesWith: 5, matchesAgainst: 9 }
    );

    const result = await computeViewerMatchups({
      db: db as unknown as DatabaseClient,
      viewerPlayerId: PROFILE_PLAYER_ID,
      id: PROFILE_PLAYER_ID,
      keyType: 'otr',
    });

    expect(result).toEqual({ matchesWith: 0, matchesAgainst: 0 });
    expect(db.aggregateCallCount).toBe(0);
  });

  it('returns the with/against counts for a viewer who shares matches', async () => {
    const db = makeDb(
      { id: PROFILE_PLAYER_ID, defaultRuleset: Ruleset.Osu },
      { matchesWith: 3, matchesAgainst: 7 }
    );

    const result = await computeViewerMatchups({
      db: db as unknown as DatabaseClient,
      viewerPlayerId: 1001,
      id: PROFILE_PLAYER_ID,
      keyType: 'otr',
    });

    expect(result).toEqual({ matchesWith: 3, matchesAgainst: 7 });
    expect(db.aggregateCallCount).toBe(1);
  });

  it('coerces a missing aggregate row to zeros', async () => {
    const db = makeDb(
      { id: PROFILE_PLAYER_ID, defaultRuleset: Ruleset.Osu },
      undefined
    );

    const result = await computeViewerMatchups({
      db: db as unknown as DatabaseClient,
      viewerPlayerId: 1001,
      id: PROFILE_PLAYER_ID,
      keyType: 'otr',
    });

    expect(result).toEqual({ matchesWith: 0, matchesAgainst: 0 });
    expect(db.aggregateCallCount).toBe(1);
  });
});

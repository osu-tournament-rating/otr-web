import { describe, expect, it, mock } from 'bun:test';
import { Mods, Ruleset, VerificationStatus } from '@otr/core/osu/enums';

mock.module('../../client', () => ({
  APIError: class APIError extends Error {},
}));

const { RoomFetchService } = await import('../room-fetch-service');

const createService = (existingScore?: {
  id: number;
  verificationStatus: number;
}) => {
  const inserted: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];

  const tx = {
    query: {
      players: { findFirst: async () => ({ id: 7 }) },
      gameScores: { findFirst: async () => existingScore },
    },
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        inserted.push(values);
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updated.push(values);
        },
      }),
    }),
  };

  const service = new RoomFetchService({
    db: {} as never,
    api: {} as never,
    rateLimiter: {} as never,
    logger: { warn: () => {}, error: () => {}, info: () => {} } as never,
    publishBeatmapFetch: async () => {},
    dataCompletion: {} as never,
  });

  const processRoomScores = (score: Record<string, unknown>) =>
    (
      service as unknown as {
        processRoomScores: (...args: unknown[]) => Promise<void>;
      }
    ).processRoomScores(
      tx,
      [score],
      { details: { teams: {} } },
      1,
      Ruleset.Osu,
      new Map([[100, {}]]),
      VerificationStatus.None,
      VerificationStatus.None
    );

  return { inserted, updated, processRoomScores };
};

const createScore = (mods: string[]) => ({
  user_id: 100,
  total_score: 100_001,
  legacy_total_score: 40_000,
  mods: mods.map((acronym) => ({ acronym })),
  statistics: {},
  accuracy: 0.98,
  pp: null,
  max_combo: 500,
  passed: true,
  rank: 'S',
});

describe('processRoomScores', () => {
  it('stores easy scores with the multiplier', async () => {
    const { inserted, processRoomScores } = createService();

    await processRoomScores(createScore(['EZ', 'HD']));

    expect(inserted[0]?.rawScore).toBe(100_001);
    expect(inserted[0]?.adjustedScore).toBe(175_002);
    expect(inserted[0]?.mods).toBe((Mods.Easy | Mods.Hidden) as Mods);
    expect(inserted[0]?.legacyTotalScore).toBe(40_000);
  });

  it('stores non-easy scores unchanged', async () => {
    const { inserted, processRoomScores } = createService();

    await processRoomScores(createScore(['HD']));

    expect(inserted[0]?.rawScore).toBe(100_001);
    expect(inserted[0]?.adjustedScore).toBeNull();
    expect(inserted[0]?.legacyTotalScore).toBe(40_000);
  });

  it('applies the multiplier when updating an existing score', async () => {
    const { updated, processRoomScores } = createService({
      id: 55,
      verificationStatus: VerificationStatus.None,
    });

    await processRoomScores(createScore(['EZ']));

    expect(updated[0]?.rawScore).toBe(100_001);
    expect(updated[0]?.adjustedScore).toBe(175_002);
    expect(updated[0]?.legacyTotalScore).toBe(40_000);
  });
});

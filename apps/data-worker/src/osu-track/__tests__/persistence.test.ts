import { describe, expect, it } from 'bun:test';
import type { UserStatUpdate } from '@otr/core';

import { pickRelevantStatUpdate } from '../persistence';

const createUpdate = (
  timestamp: string,
  overrides: Partial<UserStatUpdate> = {}
): UserStatUpdate => ({
  count300: 0,
  count100: 0,
  count50: 0,
  playCount: 0,
  rankedScore: 0,
  totalScore: 0,
  rank: 100,
  level: 0,
  pp: 0,
  accuracy: 0,
  countSs: 0,
  countS: 0,
  countA: 0,
  timestamp: new Date(timestamp),
  ...overrides,
});

describe('pickRelevantStatUpdate', () => {
  it('returns null when updates array is empty', () => {
    expect(pickRelevantStatUpdate([], null)).toBeNull();
  });

  it('returns earliest entry when earliest match date is unavailable', () => {
    const updates = [
      createUpdate('2024-05-02T00:00:00.000Z', { rank: 50 }),
      createUpdate('2024-05-01T00:00:00.000Z', { rank: 25 }),
    ];

    const selected = pickRelevantStatUpdate(updates, null);

    expect(selected?.rank).toBe(25);
    expect(selected?.timestamp.toISOString()).toBe(
      '2024-05-01T00:00:00.000Z'
    );
  });

  it('returns update closest to earliest verified match date', () => {
    const updates = [
      createUpdate('2024-05-01T00:00:00.000Z', { rank: 25 }),
      createUpdate('2024-05-05T00:00:00.000Z', { rank: 10 }),
      createUpdate('2024-05-03T00:00:00.000Z', { rank: 15 }),
    ];

    const earliestMatch = new Date('2024-05-04T00:00:00.000Z');

    const selected = pickRelevantStatUpdate(updates, earliestMatch);

    expect(selected?.rank).toBe(10);
    expect(selected?.timestamp.toISOString()).toBe(
      '2024-05-05T00:00:00.000Z'
    );
  });
});

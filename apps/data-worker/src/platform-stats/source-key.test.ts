import { describe, expect, it } from 'bun:test';

import { formatPlayerStatsSourceKey } from './source-key';

const now = new Date('2026-09-09T23:30:00.000Z');

const timestamps = {
  ratingsCreated: new Date('2026-08-18T12:00:00.000Z'),
  tournamentStatsCreated: new Date('2026-08-18T12:05:00.000Z'),
  tournamentsUpdated: new Date('2026-09-01T08:00:00.000Z'),
  matchesUpdated: new Date('2026-09-02T09:00:00.000Z'),
};

describe('formatPlayerStatsSourceKey', () => {
  it('joins every input timestamp with the snapshot date', () => {
    expect(formatPlayerStatsSourceKey(timestamps, now)).toBe(
      [
        '2026-08-18T12:00:00.000Z',
        '2026-08-18T12:05:00.000Z',
        '2026-09-01T08:00:00.000Z',
        '2026-09-02T09:00:00.000Z',
        '2026-09-09',
      ].join('|')
    );
  });

  it('marks an empty input table instead of dropping its slot', () => {
    expect(
      formatPlayerStatsSourceKey(
        { ...timestamps, tournamentStatsCreated: null },
        now
      )
    ).toBe(
      [
        '2026-08-18T12:00:00.000Z',
        'none',
        '2026-09-01T08:00:00.000Z',
        '2026-09-02T09:00:00.000Z',
        '2026-09-09',
      ].join('|')
    );
  });

  it('keeps the key stable across a day but changes at the UTC date boundary', () => {
    const sameDay = new Date('2026-09-09T00:00:00.000Z');
    const nextDay = new Date('2026-09-10T00:00:00.000Z');

    expect(formatPlayerStatsSourceKey(timestamps, sameDay)).toBe(
      formatPlayerStatsSourceKey(timestamps, now)
    );
    expect(formatPlayerStatsSourceKey(timestamps, nextDay)).not.toBe(
      formatPlayerStatsSourceKey(timestamps, now)
    );
  });

  it('changes when any source table advances', () => {
    const baseline = formatPlayerStatsSourceKey(timestamps, now);

    for (const key of Object.keys(timestamps) as (keyof typeof timestamps)[]) {
      expect(
        formatPlayerStatsSourceKey(
          { ...timestamps, [key]: new Date('2026-09-09T10:00:00.000Z') },
          now
        )
      ).not.toBe(baseline);
    }
  });
});

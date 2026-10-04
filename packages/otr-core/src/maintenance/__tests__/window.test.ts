import { describe, expect, it } from 'bun:test';

import {
  isRatingRecalculationPending,
  latestMaintenanceWindowStart,
} from '../window';

describe('latestMaintenanceWindowStart', () => {
  it('returns the same-day start during the window (Tuesday 12:00 UTC)', () => {
    expect(
      latestMaintenanceWindowStart(new Date('2026-01-06T12:00:00Z'))
    ).toEqual(new Date('2026-01-06T11:45:00Z'));
  });

  it('returns the same instant exactly at the window start', () => {
    expect(
      latestMaintenanceWindowStart(new Date('2026-01-06T11:45:00Z'))
    ).toEqual(new Date('2026-01-06T11:45:00Z'));
  });

  it('returns the previous week just before the window opens (Tuesday 11:44 UTC)', () => {
    expect(
      latestMaintenanceWindowStart(new Date('2026-01-06T11:44:59Z'))
    ).toEqual(new Date('2025-12-30T11:45:00Z'));
  });

  it('returns the prior Tuesday on a Wednesday', () => {
    expect(
      latestMaintenanceWindowStart(new Date('2026-01-07T09:00:00Z'))
    ).toEqual(new Date('2026-01-06T11:45:00Z'));
  });

  it('returns the prior Tuesday on a Monday', () => {
    expect(
      latestMaintenanceWindowStart(new Date('2026-01-12T23:59:00Z'))
    ).toEqual(new Date('2026-01-06T11:45:00Z'));
  });
});

describe('isRatingRecalculationPending', () => {
  it('returns false when no ratings exist', () => {
    expect(
      isRatingRecalculationPending(new Date('2026-01-06T12:00:00Z'), null)
    ).toBe(false);
  });

  it('returns true inside the window before the processor commits', () => {
    expect(
      isRatingRecalculationPending(
        new Date('2026-01-06T11:50:00Z'),
        new Date('2026-01-05T12:00:00Z')
      )
    ).toBe(true);
  });

  it('returns false inside the window once the processor has committed', () => {
    expect(
      isRatingRecalculationPending(
        new Date('2026-01-06T12:06:00Z'),
        new Date('2026-01-06T12:05:00Z')
      )
    ).toBe(false);
  });

  it('returns true after the window ends when the processor overran', () => {
    expect(
      isRatingRecalculationPending(
        new Date('2026-01-06T13:00:00Z'),
        new Date('2025-12-30T12:04:00Z')
      )
    ).toBe(true);
  });

  it('returns true the next day when the processor never ran', () => {
    expect(
      isRatingRecalculationPending(
        new Date('2026-01-07T08:00:00Z'),
        new Date('2025-12-30T12:04:00Z')
      )
    ).toBe(true);
  });

  it('returns false later in the week after a normal run', () => {
    expect(
      isRatingRecalculationPending(
        new Date('2026-01-09T18:00:00Z'),
        new Date('2026-01-06T12:04:00Z')
      )
    ).toBe(false);
  });

  it('treats a rebuild exactly at the window start as fresh', () => {
    expect(
      isRatingRecalculationPending(
        new Date('2026-01-06T12:00:00Z'),
        new Date('2026-01-06T11:45:00Z')
      )
    ).toBe(false);
  });
});

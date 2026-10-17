import { describe, expect, it } from 'bun:test';

import { linearScale, tieredScale } from '@/lib/filters/scale';
import { tournamentRankScale } from '@/lib/filters/tournament-rank';

import { isWholeNumberScale, parseRangeBox, resolveTypedBound } from '../range';

describe('parseRangeBox', () => {
  it('reads plain numbers with or without separators', () => {
    expect(parseRangeBox('1000')).toBe(1000);
    expect(parseRangeBox('1,000')).toBe(1000);
    expect(parseRangeBox(' 5.25 ')).toBe(5.25);
    expect(parseRangeBox('.5')).toBe(0.5);
  });

  it('reads anything else as no number', () => {
    expect(parseRangeBox('')).toBeUndefined();
    expect(parseRangeBox('abc')).toBeUndefined();
    expect(parseRangeBox('1e3')).toBeUndefined();
    expect(parseRangeBox('5.')).toBeUndefined();
  });
});

describe('resolveTypedBound', () => {
  it('keeps exactly what was typed, between slider stops', () => {
    // The SR slider stops every 0.1 and the rating slider every 20; typing
    // never snaps to them.
    expect(resolveTypedBound(5.25, { bound: 'min', min: 0, max: 15 })).toBe(
      5.25
    );
    expect(
      resolveTypedBound(1234, {
        bound: 'max',
        min: 100,
        max: 4000,
        integer: true,
      })
    ).toBe(1234);
  });

  it('holds the value inside the domain', () => {
    expect(resolveTypedBound(-3, { bound: 'min', min: 0, max: 15 })).toBe(0);
    expect(resolveTypedBound(99, { bound: 'max', min: 0, max: 15 })).toBe(15);
  });

  it('keeps each bound on its side of the other', () => {
    expect(
      resolveTypedBound(9, { bound: 'min', min: 0, max: 15, other: 7 })
    ).toBe(7);
    expect(
      resolveTypedBound(3, { bound: 'max', min: 0, max: 15, other: 5 })
    ).toBe(5);
  });

  it('rounds a fraction on a whole-number domain', () => {
    expect(
      resolveTypedBound(1500.4, {
        bound: 'min',
        min: 1,
        max: 1_000_000,
        integer: true,
      })
    ).toBe(1500);
    expect(
      resolveTypedBound(0.2, { bound: 'min', min: 1, max: 10, integer: true })
    ).toBe(1);
  });
});

describe('isWholeNumberScale', () => {
  it('tells whole-number tracks from fractional ones', () => {
    expect(
      isWholeNumberScale(linearScale({ min: 0, max: 15, step: 0.1 }))
    ).toBe(false);
    expect(
      isWholeNumberScale(linearScale({ min: 100, max: 4000, step: 20 }))
    ).toBe(true);
    expect(isWholeNumberScale(linearScale({ min: 0, max: 10 }))).toBe(true);
    expect(isWholeNumberScale(tournamentRankScale)).toBe(true);
    expect(
      isWholeNumberScale(
        tieredScale({
          tiers: [
            { start: 0, end: 2, step: 0.5 },
            { start: 2, end: 10, step: 1 },
          ],
        })
      )
    ).toBe(false);
  });
});

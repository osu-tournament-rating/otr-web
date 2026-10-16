import { describe, expect, it } from 'bun:test';

import {
  formatAccuracy,
  formatCount,
  formatCountOf,
  formatId,
  formatNumber,
  formatOrdinal,
  formatPercent,
  formatPercentile,
  formatRank,
  formatRating,
  formatRatingDelta,
  formatRatingPrecise,
  formatYear,
  getDeltaDirection,
} from '../number';

const EM_DASH = '—';
const MINUS = '−';

describe('formatCount', () => {
  it('separates thousands', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('rounds to a whole number', () => {
    expect(formatCount(12.6)).toBe('13');
    expect(formatCount(-0.4)).toBe('0');
  });

  it('prints the empty text for missing or non-finite values', () => {
    expect(formatCount(null)).toBe(EM_DASH);
    expect(formatCount(undefined)).toBe(EM_DASH);
    expect(formatCount(Number.NaN)).toBe(EM_DASH);
    expect(formatCount(Number.POSITIVE_INFINITY, { empty: '' })).toBe('');
  });
});

describe('formatCountOf', () => {
  it('pairs a count with its noun', () => {
    expect(formatCountOf(1, 'tournament')).toBe('1 tournament');
    expect(formatCountOf(0, 'tournament')).toBe('0 tournaments');
    expect(formatCountOf(1204, 'match', 'matches')).toBe('1,204 matches');
  });
});

describe('formatNumber', () => {
  it('fixes decimals when asked', () => {
    expect(formatNumber(1234.5, { decimals: 2 })).toBe('1,234.50');
    expect(formatNumber(3, { decimals: 1 })).toBe('3.0');
  });

  it('drops trailing zeros up to a maximum', () => {
    expect(formatNumber(174.5, { maxDecimals: 2 })).toBe('174.5');
    expect(formatNumber(180, { maxDecimals: 2 })).toBe('180');
    expect(formatNumber(4.199999, { maxDecimals: 1 })).toBe('4.2');
  });

  it('never prints negative zero', () => {
    expect(formatNumber(-0.04, { decimals: 1 })).toBe('0.0');
    expect(formatNumber(-0)).toBe('0');
  });

  it('rounds halves away from zero', () => {
    expect(formatNumber(2.5)).toBe('3');
    expect(formatNumber(-2.5)).toBe('-3');
    expect(formatNumber(0.05, { decimals: 1 })).toBe('0.1');
  });
});

describe('formatRank', () => {
  it('always writes a hash and separators', () => {
    expect(formatRank(1)).toBe('#1');
    expect(formatRank(1234)).toBe('#1,234');
    expect(formatRank(null)).toBe(EM_DASH);
  });
});

describe('formatRating', () => {
  it('rounds to whole, with separators', () => {
    expect(formatRating(1234.56)).toBe('1,235');
    expect(formatRating(987.4)).toBe('987');
  });

  it('keeps two decimals in the precise form', () => {
    expect(formatRatingPrecise(1234.567)).toBe('1,234.57');
    expect(formatRatingPrecise(null)).toBe(EM_DASH);
  });
});

describe('rating deltas', () => {
  it('shows a sign and one decimal', () => {
    expect(formatRatingDelta(12.34)).toBe('+12.3');
    expect(formatRatingDelta(-4.56)).toBe(`${MINUS}4.6`);
    expect(formatRatingDelta(1234.56)).toBe('+1,234.6');
  });

  it('is flat once rounded to zero', () => {
    expect(formatRatingDelta(0)).toBe('0.0');
    expect(formatRatingDelta(0.04)).toBe('0.0');
    expect(formatRatingDelta(-0.04)).toBe('0.0');
    expect(getDeltaDirection(0.04)).toBe('flat');
    expect(getDeltaDirection(-0.04)).toBe('flat');
  });

  it('agrees with its own rounding at the edge', () => {
    expect(formatRatingDelta(0.05)).toBe('+0.1');
    expect(getDeltaDirection(0.05)).toBe('up');
    expect(formatRatingDelta(-0.05)).toBe(`${MINUS}0.1`);
    expect(getDeltaDirection(-0.05)).toBe('down');
  });
});

describe('formatOrdinal', () => {
  it('picks the English suffix', () => {
    const cases: Array<[number, string]> = [
      [1, '1st'],
      [2, '2nd'],
      [3, '3rd'],
      [4, '4th'],
      [11, '11th'],
      [12, '12th'],
      [13, '13th'],
      [21, '21st'],
      [22, '22nd'],
      [23, '23rd'],
      [101, '101st'],
      [111, '111th'],
      [1001, '1,001st'],
    ];
    for (const [value, expected] of cases) {
      expect(formatOrdinal(value)).toBe(expected);
    }
  });
});

describe('formatPercentile', () => {
  it('writes a whole ordinal, rounded down', () => {
    expect(formatPercentile(97.53)).toBe('97th percentile');
    expect(formatPercentile(42.99)).toBe('42nd percentile');
    expect(formatPercentile(97.53, { short: true })).toBe('97th');
  });

  it('stays within 1st and 99th', () => {
    expect(formatPercentile(100)).toBe('99th percentile');
    expect(formatPercentile(99.97)).toBe('99th percentile');
    expect(formatPercentile(0)).toBe('1st percentile');
    expect(formatPercentile(0.4)).toBe('1st percentile');
  });

  it('prints the empty text when there is none', () => {
    expect(formatPercentile(null)).toBe(EM_DASH);
  });
});

describe('formatPercent and formatAccuracy', () => {
  it('reads fractions', () => {
    expect(formatPercent(0.5423)).toBe('54.2%');
    expect(formatPercent(1)).toBe('100.0%');
    expect(formatPercent(0.5, { decimals: 0 })).toBe('50%');
    expect(formatAccuracy(0.98543)).toBe('98.54%');
    expect(formatAccuracy(undefined)).toBe(EM_DASH);
  });
});

describe('labels', () => {
  it('never separates years or IDs', () => {
    expect(formatYear(2024)).toBe('2024');
    expect(formatId(12345678)).toBe('12345678');
    expect(formatId(1234.9)).toBe('1234');
    expect(formatId(null)).toBe(EM_DASH);
  });
});

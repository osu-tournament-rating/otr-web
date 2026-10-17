import { describe, expect, it } from 'bun:test';

import { tierNames } from '@/lib/utils/tierData';

import { formatTierName } from '../tier';

describe('formatTierName', () => {
  it('writes the subtier as a roman numeral', () => {
    expect(formatTierName('Gold', 1)).toBe('Gold I');
    expect(formatTierName('Gold', 2)).toBe('Gold II');
    expect(formatTierName('Bronze', 3)).toBe('Bronze III');
    expect(formatTierName('Grandmaster', 2)).toBe('Grandmaster II');
  });

  it('writes the tier alone without a subtier', () => {
    expect(formatTierName('Platinum')).toBe('Platinum');
    expect(formatTierName('Platinum', undefined)).toBe('Platinum');
    expect(formatTierName('Platinum', null)).toBe('Platinum');
    expect(formatTierName('Platinum', 0)).toBe('Platinum');
    expect(formatTierName('Platinum', 4)).toBe('Platinum');
  });

  it('never gives Elite Grandmaster a subtier', () => {
    expect(formatTierName('Elite Grandmaster', 1)).toBe('Elite Grandmaster');
    expect(formatTierName('Elite Grandmaster')).toBe('Elite Grandmaster');
  });

  it('names every tier', () => {
    for (const tier of tierNames) {
      expect(formatTierName(tier, 3)).toStartWith(tier);
    }
  });
});

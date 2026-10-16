import { describe, expect, it } from 'bun:test';

import { formatBadgeCount } from '../count';

describe('formatBadgeCount', () => {
  it('shows small counts as they are', () => {
    expect(formatBadgeCount(3)).toBe('3');
    expect(formatBadgeCount(99)).toBe('99');
  });

  it('caps counts above the maximum', () => {
    expect(formatBadgeCount(100)).toBe('99+');
    expect(formatBadgeCount(12_345, 999)).toBe('999+');
  });

  it('always uses thousands separators', () => {
    expect(formatBadgeCount(1_234, 9_999)).toBe('1,234');
    expect(formatBadgeCount(20_000, 9_999)).toBe('9,999+');
  });

  it('reads negative, fractional and missing counts safely', () => {
    expect(formatBadgeCount(-4)).toBe('0');
    expect(formatBadgeCount(Number.NaN)).toBe('0');
    expect(formatBadgeCount(2.7)).toBe('2');
  });
});

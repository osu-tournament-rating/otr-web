import { describe, expect, it } from 'bun:test';

import { formatBadgeCount, isCountContent } from '../count';

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

describe('isCountContent', () => {
  it('accepts numbers and formatted counts', () => {
    expect(isCountContent(3)).toBe(true);
    expect(isCountContent('1,204')).toBe(true);
    expect(isCountContent(formatBadgeCount(140))).toBe(true);
  });

  it('reads only its own text, so a screen-reader label after a count is fine', () => {
    // An element, such as <span className="sr-only"> unseen</span>.
    const label = { type: 'span', props: { children: ' unseen' } };

    expect(isCountContent(['3', label])).toBe(true);
    expect(isCountContent([label])).toBe(false);
    expect(isCountContent([label, 'Admin'])).toBe(false);
  });

  it('rejects words, labels with digits and other content', () => {
    expect(isCountContent('Pre-verified')).toBe(false);
    expect(isCountContent('mania 4K')).toBe(false);
    expect(isCountContent('4v4')).toBe(false);
    expect(isCountContent('')).toBe(false);
    expect(isCountContent(Number.NaN)).toBe(false);
    expect(isCountContent(['1', ' match'])).toBe(false);
    expect(isCountContent(null)).toBe(false);
  });
});

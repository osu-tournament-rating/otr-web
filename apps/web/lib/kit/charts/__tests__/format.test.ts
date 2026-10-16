import { describe, expect, it } from 'bun:test';

import {
  formatCompactTick,
  formatCountTick,
  formatIdTick,
  formatNumberTick,
  formatPercentTick,
  formatTimeTick,
  formatYearTick,
} from '@/lib/kit/charts/format';

describe('chart number formats', () => {
  it('separates thousands in counts', () => {
    expect(formatCountTick(0)).toBe('0');
    expect(formatCountTick(950)).toBe('950');
    expect(formatCountTick(12_345)).toBe('12,345');
    expect(formatCountTick(1_234_567)).toBe('1,234,567');
    expect(formatCountTick(12.6)).toBe('13');
  });

  it('separates thousands in quantities and keeps two decimals at most', () => {
    expect(formatNumberTick(1_250)).toBe('1,250');
    expect(formatNumberTick(0.25)).toBe('0.25');
    expect(formatNumberTick(1_234.5678)).toBe('1,234.57');
    expect(formatNumberTick(-1_500)).toBe('-1,500');
  });

  it('never separates years or IDs', () => {
    expect(formatYearTick(2024)).toBe('2024');
    expect(formatYearTick('2019')).toBe('2019');
    expect(formatIdTick(1_234_567)).toBe('1234567');
    expect(formatIdTick('98765')).toBe('98765');
  });

  it('shortens large quantities', () => {
    expect(formatCompactTick(950)).toBe('950');
    expect(formatCompactTick(250_000)).toBe('250k');
    expect(formatCompactTick(999_600)).toBe('1M');
    expect(formatCompactTick(1_250_000)).toBe('1.25M');
    expect(formatCompactTick(-25_000)).toBe('-25k');
  });

  it('formats percentages without trailing zeros', () => {
    expect(formatPercentTick(95)).toBe('95%');
    expect(formatPercentTick(97.5)).toBe('97.5%');
    expect(formatPercentTick(33.3333)).toBe('33.33%');
  });
});

describe('formatTimeTick', () => {
  it('formats in UTC whatever the local zone', () => {
    // Midnight UTC is still the previous day west of Greenwich.
    const july20 = Date.UTC(2024, 6, 20);

    expect(formatTimeTick(july20, 'day')).toBe('Jul 20');
    expect(formatTimeTick(july20, 'month')).toBe('Jul 2024');
    expect(formatTimeTick(Date.UTC(2024, 0, 1), 'year')).toBe('2024');
  });
});

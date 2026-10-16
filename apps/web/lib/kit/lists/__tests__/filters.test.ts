import { describe, expect, it } from 'bun:test';

import {
  formatChoiceFilterLabel,
  formatDayRangeFilterLabel,
  formatFilterNumber,
  formatRangeFilterLabel,
} from '../filters';

describe('formatRangeFilterLabel', () => {
  it('writes both ends with a spaced en dash', () => {
    expect(formatRangeFilterLabel('SR', { min: 5, max: 7.25 })).toBe(
      'SR: 5 – 7.25'
    );
  });

  it('words open ends', () => {
    expect(formatRangeFilterLabel('Rank restriction', { min: 1000 })).toBe(
      'Rank restriction: at least 1,000'
    );
    expect(formatRangeFilterLabel('BPM', { max: 180 })).toBe(
      'BPM: at most 180'
    );
  });

  it('is empty for an open range', () => {
    expect(formatRangeFilterLabel('SR', {})).toBe('');
  });

  it('takes a formatter, such as a duration', () => {
    const duration = (seconds: number) =>
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    expect(
      formatRangeFilterLabel('Length', { min: 90, max: 300 }, duration)
    ).toBe('Length: 1:30 – 5:00');
  });

  it('keeps separators and drops trailing zeros', () => {
    expect(formatFilterNumber(1_000_000)).toBe('1,000,000');
    expect(formatFilterNumber(5.5)).toBe('5.5');
    expect(formatFilterNumber(5.256)).toBe('5.26');
  });
});

describe('formatChoiceFilterLabel', () => {
  it('lists up to two names, then counts the rest', () => {
    expect(formatChoiceFilterLabel('Status', ['Verified'])).toBe(
      'Status: Verified'
    );
    expect(formatChoiceFilterLabel('Status', ['Pending', 'Verified'])).toBe(
      'Status: Pending, Verified'
    );
    expect(
      formatChoiceFilterLabel('Status', [
        'Pending',
        'Pre-verified',
        'Pre-rejected',
        'Verified',
      ])
    ).toBe('Status: Pending, Pre-verified +2');
  });

  it('is empty when nothing is selected', () => {
    expect(formatChoiceFilterLabel('Status', [])).toBe('');
  });
});

describe('formatDayRangeFilterLabel', () => {
  it('uses the format family range', () => {
    expect(
      formatDayRangeFilterLabel('Dates', {
        from: '2024-07-20',
        to: '2024-08-03',
      })
    ).toBe('Dates: Jul 20 – Aug 3, 2024');
  });

  it('reads open ends as a sentence', () => {
    expect(formatDayRangeFilterLabel('Dates', { from: '2024-07-20' })).toBe(
      'Dates: from Jul 20, 2024'
    );
    expect(formatDayRangeFilterLabel('Dates', { to: '2024-08-03' })).toBe(
      'Dates: until Aug 3, 2024'
    );
  });

  it('is empty for an open range', () => {
    expect(formatDayRangeFilterLabel('Dates', {})).toBe('');
  });
});

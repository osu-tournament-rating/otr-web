import { describe, expect, it } from 'bun:test';

import {
  formatDuration,
  formatUTCDayRange,
  parseDuration,
} from '@/lib/utils/date';

describe('parseDuration', () => {
  it('reads mm:ss', () => {
    expect(parseDuration('3:42')).toBe(222);
    expect(parseDuration('0:07')).toBe(7);
    expect(parseDuration('12:00')).toBe(720);
  });

  it('reads h:mm:ss', () => {
    expect(parseDuration('1:23:45')).toBe(5025);
  });

  it('reads bare seconds', () => {
    expect(parseDuration('222')).toBe(222);
    expect(parseDuration('0')).toBe(0);
  });

  it('ignores surrounding whitespace', () => {
    expect(parseDuration('  3:42 ')).toBe(222);
  });

  it('rejects anything that is not a duration', () => {
    for (const input of [
      '',
      'abc',
      '-1',
      '3:60',
      '3:',
      ':42',
      '1.5',
      '3:4:5:6',
    ]) {
      expect(parseDuration(input)).toBeNull();
    }
  });

  it('round-trips through formatDuration', () => {
    for (const seconds of [0, 7, 222, 720, 5025]) {
      expect(parseDuration(formatDuration(seconds))).toBe(seconds);
    }
  });
});

describe('formatUTCDayRange', () => {
  const range = (first: string, last: string) =>
    formatUTCDayRange(new Date(first), new Date(last));

  it('collapses a single UTC day', () => {
    expect(range('2024-07-20T01:00:00Z', '2024-07-20T23:00:00Z')).toBe(
      'Sat, Jul 20, 2024'
    );
  });

  it('names the year once within a year', () => {
    expect(range('2024-07-20T12:00:00Z', '2024-07-21T12:00:00Z')).toBe(
      'Sat, Jul 20 – Sun, Jul 21, 2024'
    );
    expect(range('2024-07-31T12:00:00Z', '2024-08-02T12:00:00Z')).toBe(
      'Wed, Jul 31 – Fri, Aug 2, 2024'
    );
  });

  it('names both years across a new year', () => {
    expect(range('2024-12-31T12:00:00Z', '2025-01-01T12:00:00Z')).toBe(
      'Tue, Dec 31, 2024 – Wed, Jan 1, 2025'
    );
  });
});

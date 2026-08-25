import { describe, expect, it } from 'bun:test';

import { formatDuration, parseDuration } from '@/lib/utils/date';

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

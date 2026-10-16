import { describe, expect, it } from 'bun:test';

import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { formatCount, formatPercent } from '@/lib/kit/format/number';

import { isMissingValue, showFromClass } from '../cell';

describe('isMissingValue', () => {
  it('treats nothing as missing', () => {
    expect(isMissingValue(null)).toBe(true);
    expect(isMissingValue(undefined)).toBe(true);
    expect(isMissingValue(false)).toBe(true);
    expect(isMissingValue('')).toBe(true);
    expect(isMissingValue('   ')).toBe(true);
  });

  it("treats the formatters' em dash as missing", () => {
    expect(isMissingValue(EMPTY_VALUE)).toBe(true);
    expect(isMissingValue(formatCount(null))).toBe(true);
    expect(isMissingValue(formatPercent(undefined))).toBe(true);
  });

  it('keeps zero and real values', () => {
    expect(isMissingValue(0)).toBe(false);
    expect(isMissingValue('0')).toBe(false);
    expect(isMissingValue(formatCount(0))).toBe(false);
    expect(isMissingValue('1,204')).toBe(false);
    expect(isMissingValue(true)).toBe(false);
  });
});

describe('showFromClass', () => {
  it('hides a column below its breakpoint', () => {
    expect(showFromClass('md')).toBe('hidden md:table-cell');
    expect(showFromClass('xl')).toBe('hidden xl:table-cell');
  });

  it('adds nothing without a breakpoint', () => {
    expect(showFromClass(undefined)).toBeUndefined();
  });
});

import { describe, expect, it } from 'bun:test';

import {
  clampPage,
  formatLoadedReadout,
  formatPageReadout,
  getPageItems,
  getPageRange,
  getTotalPages,
} from '../pagination';

describe('getTotalPages', () => {
  it('rounds up', () => {
    expect(getTotalPages(8412, 50)).toBe(169);
    expect(getTotalPages(100, 50)).toBe(2);
    expect(getTotalPages(101, 50)).toBe(3);
  });

  it('is at least 1', () => {
    expect(getTotalPages(0, 50)).toBe(1);
    expect(getTotalPages(-3, 50)).toBe(1);
    expect(getTotalPages(10, 0)).toBe(1);
    expect(getTotalPages(Number.NaN, 50)).toBe(1);
  });
});

describe('clampPage', () => {
  it('keeps a page inside the range', () => {
    expect(clampPage(5, 169)).toBe(5);
    expect(clampPage(0, 169)).toBe(1);
    expect(clampPage(-2, 169)).toBe(1);
    expect(clampPage(400, 169)).toBe(169);
  });

  it('rounds fractions down and treats non-numbers as page 1', () => {
    expect(clampPage(2.9, 169)).toBe(2);
    expect(clampPage(Number.NaN, 169)).toBe(1);
    expect(clampPage(Number.POSITIVE_INFINITY, 169)).toBe(1);
    expect(clampPage(3, 0)).toBe(1);
  });
});

describe('getPageRange', () => {
  it('gives the 1-based first and last row', () => {
    expect(getPageRange(1, 50, 8412)).toEqual({ start: 1, end: 50 });
    expect(getPageRange(2, 50, 8412)).toEqual({ start: 51, end: 100 });
    expect(getPageRange(169, 50, 8412)).toEqual({ start: 8401, end: 8412 });
  });

  it('clamps the page first', () => {
    expect(getPageRange(500, 50, 8412)).toEqual({ start: 8401, end: 8412 });
  });

  it('is 0 to 0 when there is nothing', () => {
    expect(getPageRange(1, 50, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe('formatPageReadout', () => {
  it('reads like "1–50 of 8,412" with separators', () => {
    expect(formatPageReadout(1, 50, 8412)).toBe('1–50 of 8,412');
    expect(formatPageReadout(84, 50, 8412)).toBe('4,151–4,200 of 8,412');
    expect(formatPageReadout(169, 50, 8412)).toBe('8,401–8,412 of 8,412');
  });

  it('names a single row once', () => {
    expect(formatPageReadout(1, 50, 1)).toBe('1 of 1');
    expect(formatPageReadout(2, 50, 51)).toBe('51 of 51');
  });

  it('says so when there are no results', () => {
    expect(formatPageReadout(1, 50, 0)).toBe('No results');
  });
});

describe('getPageItems', () => {
  it('lists every page when they fit', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the first pages together near the start', () => {
    expect(getPageItems(1, 169)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 169]);
    expect(getPageItems(4, 169)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 169]);
  });

  it('centres the current page in the middle', () => {
    expect(getPageItems(5, 169)).toEqual([
      1,
      'start-ellipsis',
      4,
      5,
      6,
      'end-ellipsis',
      169,
    ]);
    expect(getPageItems(84, 169)).toEqual([
      1,
      'start-ellipsis',
      83,
      84,
      85,
      'end-ellipsis',
      169,
    ]);
  });

  it('keeps the last pages together near the end', () => {
    expect(getPageItems(169, 169)).toEqual([
      1,
      'start-ellipsis',
      165,
      166,
      167,
      168,
      169,
    ]);
    expect(getPageItems(166, 169)).toEqual([
      1,
      'start-ellipsis',
      165,
      166,
      167,
      168,
      169,
    ]);
  });

  it('shows the same number of items on every page', () => {
    for (let page = 1; page <= 40; page += 1) {
      expect(getPageItems(page, 40)).toHaveLength(7);
      expect(getPageItems(page, 40, 2)).toHaveLength(9);
    }
  });

  it('never hides a single page behind an ellipsis', () => {
    for (let page = 1; page <= 30; page += 1) {
      const items = getPageItems(page, 30);
      items.forEach((item, index) => {
        if (typeof item === 'number') return;
        const before = items[index - 1] as number;
        const after = items[index + 1] as number;
        expect(after - before).toBeGreaterThan(2);
      });
    }
  });

  it('always includes the current, first and last page', () => {
    for (let page = 1; page <= 25; page += 1) {
      const items = getPageItems(page, 25, 0);
      expect(items).toContain(page);
      expect(items[0]).toBe(1);
      expect(items.at(-1)).toBe(25);
    }
  });

  it('clamps an out-of-range page', () => {
    expect(getPageItems(400, 169)).toEqual(getPageItems(169, 169));
  });
});

describe('formatLoadedReadout', () => {
  it('counts what is showing, with the total when known', () => {
    expect(formatLoadedReadout(50, 1214)).toBe('50 of 1,214');
    expect(formatLoadedReadout(1250)).toBe('1,250');
    expect(formatLoadedReadout(50, null)).toBe('50');
  });
});

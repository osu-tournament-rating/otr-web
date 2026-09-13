import { describe, expect, test } from 'bun:test';

import { paginate } from '../paging';

const items = Array.from({ length: 12 }, (_, index) => index + 1);

describe('paginate', () => {
  test('returns the requested page and its range label', () => {
    const result = paginate(items, 2, 5);

    expect(result.items).toEqual([6, 7, 8, 9, 10]);
    expect(result.page).toBe(2);
    expect(result.pageCount).toBe(3);
    expect(result.rangeLabel).toBe('Showing 6–10 of 12');
  });

  test('clamps a page outside the range', () => {
    expect(paginate(items, 9, 5).items).toEqual([11, 12]);
    expect(paginate(items, 9, 5).page).toBe(3);
    expect(paginate(items, 0, 5).page).toBe(1);
  });

  test('labels a partial last page with its real end', () => {
    expect(paginate(items, 3, 5).rangeLabel).toBe('Showing 11–12 of 12');
  });

  test('groups thousands in the label', () => {
    const many = Array.from({ length: 2500 }, (_, index) => index);

    expect(paginate(many, 3, 50).rangeLabel).toBe('Showing 101–150 of 2,500');
  });

  test('handles an empty list', () => {
    const result = paginate([], 1, 50);

    expect(result.items).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.pageCount).toBe(1);
    expect(result.rangeLabel).toBe('Showing 0 of 0');
  });
});

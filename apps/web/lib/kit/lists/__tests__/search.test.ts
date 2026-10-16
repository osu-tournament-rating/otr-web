import { describe, expect, it } from 'bun:test';

import {
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  getSearchMinimumHint,
  isBelowSearchMinimum,
  normalizeSearchTerm,
} from '../search';

describe('search behaviour', () => {
  it('uses one delay and one minimum everywhere', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(400);
    expect(MIN_SEARCH_LENGTH).toBe(2);
  });

  it('trims the term and drops one that is too short', () => {
    expect(normalizeSearchTerm('  corsace ')).toBe('corsace');
    expect(normalizeSearchTerm(' a ')).toBe('');
    expect(normalizeSearchTerm('')).toBe('');
    expect(normalizeSearchTerm(undefined)).toBe('');
    expect(normalizeSearchTerm('a', 1)).toBe('a');
  });

  it('flags a term that is started but too short', () => {
    expect(isBelowSearchMinimum('a')).toBe(true);
    expect(isBelowSearchMinimum('  a  ')).toBe(true);
    expect(isBelowSearchMinimum('ab')).toBe(false);
    expect(isBelowSearchMinimum('   ')).toBe(false);
    expect(isBelowSearchMinimum(null)).toBe(false);
    expect(isBelowSearchMinimum('ab', 3)).toBe(true);
  });

  it('words the hint with the minimum', () => {
    expect(getSearchMinimumHint()).toBe(
      'Type at least 2 characters to search.'
    );
    expect(getSearchMinimumHint(3)).toBe(
      'Type at least 3 characters to search.'
    );
  });
});

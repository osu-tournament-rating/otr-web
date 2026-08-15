import { describe, expect, test } from 'bun:test';

import {
  buildBeatmapSearchParams,
  minBeatmapSearchLength,
  normalizeBeatmapSearchQuery,
} from '@/lib/beatmaps/list-params';
import { beatmapListFilterSchema } from '@/lib/validation-schema';

const baseFilter = beatmapListFilterSchema.parse({});

describe('normalizeBeatmapSearchQuery', () => {
  test('drops terms shorter than the minimum', () => {
    expect(minBeatmapSearchLength).toBe(2);
    expect(normalizeBeatmapSearchQuery(undefined)).toBeUndefined();
    expect(normalizeBeatmapSearchQuery('')).toBeUndefined();
    expect(normalizeBeatmapSearchQuery('a')).toBeUndefined();
    expect(normalizeBeatmapSearchQuery('  a  ')).toBeUndefined();
  });

  test('keeps trimmed terms at or above the minimum', () => {
    expect(normalizeBeatmapSearchQuery('ab')).toBe('ab');
    expect(normalizeBeatmapSearchQuery('  medley  ')).toBe('medley');
  });
});

describe('buildBeatmapSearchParams', () => {
  test('omits a query below the minimum length', () => {
    const params = buildBeatmapSearchParams({ ...baseFilter, q: 'a' });
    expect(params.get('q')).toBeNull();
  });

  test('serializes a query at the minimum length', () => {
    const params = buildBeatmapSearchParams({ ...baseFilter, q: ' ab ' });
    expect(params.get('q')).toBe('ab');
  });
});

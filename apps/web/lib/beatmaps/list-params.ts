import type { z } from 'zod';

import {
  beatmapListFilterSchema,
  defaultBeatmapListFilter,
} from '@/lib/validation-schema';

export type BeatmapListFilterData = z.infer<typeof beatmapListFilterSchema>;

/** Every numeric range key the beatmap list filter serializes to the URL. */
export const beatmapListNumericKeys = [
  'minSr',
  'maxSr',
  'minBpm',
  'maxBpm',
  'minCs',
  'maxCs',
  'minAr',
  'maxAr',
  'minOd',
  'maxOd',
  'minHp',
  'maxHp',
  'minLength',
  'maxLength',
  'minGameCount',
  'maxGameCount',
  'minTournamentCount',
  'maxTournamentCount',
] as const;

export type BeatmapListNumericKey = (typeof beatmapListNumericKeys)[number];

/**
 * The only filter → query-string serialization. Defaults are omitted so URLs
 * stay canonical; both the server page and the client filter bar use this.
 */
export function buildBeatmapSearchParams(
  filter: BeatmapListFilterData
): URLSearchParams {
  const params = new URLSearchParams();

  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  if (filter.ruleset !== undefined)
    params.set('ruleset', String(filter.ruleset));

  for (const key of beatmapListNumericKeys) {
    const value = filter[key];
    if (value !== undefined && Number.isFinite(value)) {
      params.set(key, String(value));
    }
  }

  if (filter.sort !== defaultBeatmapListFilter.sort) {
    params.set('sort', filter.sort);
  }
  if (filter.descending !== defaultBeatmapListFilter.descending) {
    params.set('descending', String(filter.descending));
  }

  return params;
}

/** Canonical `/beatmaps` URL for a filter, with an optional page override. */
export function buildBeatmapListPath(
  filter: BeatmapListFilterData,
  page?: number
): string {
  const params = buildBeatmapSearchParams(
    page === undefined ? filter : { ...filter, page }
  );
  return `/beatmaps${params.size ? `?${params}` : ''}`;
}

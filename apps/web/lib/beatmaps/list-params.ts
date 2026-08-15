import type { z } from 'zod';

import {
  beatmapListFilterSchema,
  defaultBeatmapListFilter,
} from '@/lib/validation-schema';

export type BeatmapListFilterData = z.infer<typeof beatmapListFilterSchema>;

/** The sort keys the URL accepts. */
export type BeatmapListSortKey = BeatmapListFilterData['sort'];

/**
 * Applied by both the sort select and the table column headers. Neither holds
 * sort state of its own: both write the URL and read the filter back from it.
 */
export type BeatmapListSortChange = (
  sort: BeatmapListSortKey,
  descending: boolean
) => void;

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
 * A single character matches too much to be worth a search, so the list waits
 * for a second one before querying.
 */
export const minBeatmapSearchLength = 2;

/**
 * The search term a filter actually queries with, or `undefined` when it is too
 * short to search on. Applied wherever `q` leaves the filter — the URL, the
 * server page — so a hand-typed `?q=a` behaves like no query at all.
 */
export function normalizeBeatmapSearchQuery(
  q: string | undefined
): string | undefined {
  const trimmed = q?.trim() ?? '';
  return trimmed.length >= minBeatmapSearchLength ? trimmed : undefined;
}

/**
 * The only filter → query-string serialization. Defaults are omitted so URLs
 * stay canonical; both the server page and the client filter bar use this.
 */
export function buildBeatmapSearchParams(
  filter: BeatmapListFilterData
): URLSearchParams {
  const params = new URLSearchParams();

  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  const q = normalizeBeatmapSearchQuery(filter.q);
  if (q) params.set('q', q);
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

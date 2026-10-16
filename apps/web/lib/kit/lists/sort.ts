/**
 * The one sort shape. The toolbar's SortControl and a table's sortable column
 * headers read and write the same `SortState`, so both always show the same
 * choice, and `sortParam` keeps it in the page address.
 */

export type SortDirection = 'asc' | 'desc';

/** A sort key: a column name such as `rating`, or a numeric enum member. */
export type SortKey = string | number;

export interface SortState<K extends SortKey = string> {
  key: K;
  direction: SortDirection;
}

/** Most columns read best biggest first: ratings, counts, dates. */
export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

/** The direction button's tooltip, as the beatmap list words it. */
export const SORT_DIRECTION_LABELS: Readonly<Record<SortDirection, string>> = {
  asc: 'Ascending order',
  desc: 'Descending order',
};

export function isSortDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

export function flipSortDirection(direction: SortDirection): SortDirection {
  return direction === 'asc' ? 'desc' : 'asc';
}

/**
 * The state after choosing `key` from a column header. The sorted key flips
 * direction; a new key starts in its own natural direction
 * (`defaultDirection`: descending, or ascending for names).
 */
export function toggleSort<K extends SortKey>(
  current: SortState<K>,
  key: K,
  defaultDirection: SortDirection = DEFAULT_SORT_DIRECTION
): SortState<K> {
  if (current.key === key) {
    return { key, direction: flipSortDirection(current.direction) };
  }
  return { key, direction: defaultDirection };
}

export function sortStatesEqual<K extends SortKey>(
  a: SortState<K>,
  b: SortState<K>
): boolean {
  return a.key === b.key && a.direction === b.direction;
}

/** Reads the `{ sort, descending }` shape the API schemas take. */
export function fromDescending<K extends SortKey>(
  key: K,
  descending: boolean
): SortState<K> {
  return { key, direction: descending ? 'desc' : 'asc' };
}

/** Writes a sort as the `{ sort, descending }` shape the API schemas take. */
export function toDescending<K extends SortKey>(
  sort: SortState<K>
): { sort: K; descending: boolean } {
  return { sort: sort.key, descending: sort.direction === 'desc' };
}

/** The `aria-sort` value for a column header. */
export function getAriaSort<K extends SortKey>(
  sort: SortState<K>,
  key: K
): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

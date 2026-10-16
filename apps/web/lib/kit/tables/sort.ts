/**
 * Sorting rows in the browser. The sort state itself (`SortState`,
 * `toggleSort` and the API adapters) lives in `@/lib/kit/lists/sort`, shared
 * by sortable column headers and the toolbar's sort control.
 */

import type { SortKey, SortState } from '@/lib/kit/lists/sort';

/** A column's sortable value. Missing values always sort last. */
export type SortValue = string | number | Date | boolean | null | undefined;

// Fixed locale, so the server and the browser order names the same way.
const collator = new Intl.Collator('en-US', {
  numeric: true,
  sensitivity: 'base',
});

function isMissing(value: SortValue): value is null | undefined {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value)) ||
    (value instanceof Date && Number.isNaN(value.getTime()))
  );
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return collator.compare(a, b);
  }
  const left = a instanceof Date ? a.getTime() : Number(a);
  const right = b instanceof Date ? b.getTime() : Number(b);
  return left === right ? 0 : left < right ? -1 : 1;
}

/**
 * Sorts rows the caller already holds in full, such as a tournament's pool.
 * Returns a new array; ties keep their order, and missing values sort last
 * in both directions. A list the server pages sorts on the server instead.
 */
export function sortRows<T, K extends SortKey>(
  rows: readonly T[],
  sort: SortState<K>,
  accessors: Readonly<Record<K, (row: T) => SortValue>>
): T[] {
  const accessor = accessors[sort.key];
  if (!accessor) return [...rows];

  const sign = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: accessor(row) }))
    .sort((a, b) => {
      const aMissing = isMissing(a.value);
      const bMissing = isMissing(b.value);
      if (aMissing || bMissing) {
        return aMissing === bMissing ? a.index - b.index : aMissing ? 1 : -1;
      }
      return sign * compareValues(a.value, b.value) || a.index - b.index;
    })
    .map(({ row }) => row);
}

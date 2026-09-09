import { formatChartNumber } from '@/lib/utils/chart';

export type Page<T> = {
  items: T[];
  /** The requested page, clamped to the available range. */
  page: number;
  pageCount: number;
  /** `Showing 101–150 of 2,500`. */
  rangeLabel: string;
};

/** One page of a client-side list, with the label its pager shows. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, items.length);

  return {
    items: items.slice(start, end),
    page: current,
    pageCount,
    rangeLabel:
      items.length === 0
        ? 'Showing 0 of 0'
        : `Showing ${formatChartNumber(start + 1)}–${formatChartNumber(end)} of ${formatChartNumber(items.length)}`,
  };
}

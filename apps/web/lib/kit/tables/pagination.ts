/**
 * Numbered paging for searchable lists: which page links to show and the
 * "1–50 of 8,412" readout. Pages are 1-based.
 */

import { formatCount } from '@/lib/kit/format/number';

/** A page number, or a gap in the page links. */
export type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

/** At least one page, so an empty list still reads "page 1 of 1". */
export function getTotalPages(totalCount: number, pageSize: number): number {
  if (!(pageSize > 0) || !(totalCount > 0)) return 1;
  return Math.ceil(totalCount / pageSize);
}

/** Keeps a page number inside 1…`totalPages`, rounding fractions down. */
export function clampPage(page: number, totalPages: number): number {
  const last = Math.max(1, Math.floor(totalPages) || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.min(last, Math.max(1, Math.floor(page)));
}

/** The 1-based positions of the first and last row on a page; 0 and 0 when empty. */
export function getPageRange(
  page: number,
  pageSize: number,
  totalCount: number
): { start: number; end: number } {
  if (!(totalCount > 0) || !(pageSize > 0)) return { start: 0, end: 0 };
  const current = clampPage(page, getTotalPages(totalCount, pageSize));
  const start = (current - 1) * pageSize + 1;
  return { start, end: Math.min(totalCount, start + pageSize - 1) };
}

/** `1–50 of 8,412`; `8,412 of 8,412` for a single row; `No results` when empty. */
export function formatPageReadout(
  page: number,
  pageSize: number,
  totalCount: number
): string {
  const { start, end } = getPageRange(page, pageSize, totalCount);
  if (end === 0) return 'No results';
  const total = formatCount(totalCount);
  return start === end
    ? `${formatCount(start)} of ${total}`
    : `${formatCount(start)}–${formatCount(end)} of ${total}`;
}

/**
 * The page links to show: always the first and last page, the current page
 * with `siblings` on each side, and an ellipsis for each gap. The count stays
 * the same as you move through the pages, so the links never jump.
 */
export function getPageItems(
  page: number,
  totalPages: number,
  siblings = 1
): PageItem[] {
  const last = Math.max(1, Math.floor(totalPages) || 1);
  const current = clampPage(page, last);
  const span = Math.max(0, Math.floor(siblings));
  // First, last, current, siblings on both sides and two gaps.
  const slots = span * 2 + 5;

  if (last <= slots) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const edgeLength = slots - 2;
  if (current <= edgeLength - span) {
    return [
      ...Array.from({ length: edgeLength }, (_, index) => index + 1),
      'end-ellipsis',
      last,
    ];
  }
  if (current >= last - edgeLength + span + 1) {
    return [
      1,
      'start-ellipsis',
      ...Array.from(
        { length: edgeLength },
        (_, index) => last - edgeLength + index + 1
      ),
    ];
  }
  return [
    1,
    'start-ellipsis',
    ...Array.from(
      { length: span * 2 + 1 },
      (_, index) => current - span + index
    ),
    'end-ellipsis',
    last,
  ];
}

/** `50 of 214` for a feed that loads more as you ask; `50` when the total is unknown. */
export function formatLoadedReadout(
  shownCount: number,
  totalCount?: number | null
): string {
  return typeof totalCount === 'number' && Number.isFinite(totalCount)
    ? `${formatCount(shownCount)} of ${formatCount(totalCount)}`
    : formatCount(shownCount);
}

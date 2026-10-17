import {
  asc,
  desc,
  sql,
  type AnyColumn,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';

import type { ReportListSort } from '@/lib/orpc/schema/report';

type Column = SQLWrapper | AnyColumn;

/** The report columns a sort reads. */
export type ReportListOrderColumns = {
  id: Column;
  created: Column;
  resolvedAt: Column;
};

/**
 * The admin report list's order: newest first unless asked otherwise. Open
 * reports have no `resolvedAt`, so they come last in either direction. Ties
 * fall back to `created`, then the ID, so pages never overlap.
 */
export function buildReportListOrder(
  columns: ReportListOrderColumns,
  sort: ReportListSort | undefined,
  descending: boolean | undefined
): SQL[] {
  const isDescending = descending ?? true;
  const direction = (column: Column) =>
    isDescending ? desc(column) : asc(column);
  const tieBreakers = [direction(columns.created), direction(columns.id)];

  if (sort === 'resolvedAt') {
    return [
      isDescending
        ? sql`${columns.resolvedAt} desc nulls last`
        : sql`${columns.resolvedAt} asc nulls last`,
      ...tieBreakers,
    ];
  }

  return tieBreakers;
}

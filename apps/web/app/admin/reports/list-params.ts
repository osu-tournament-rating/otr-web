import type { TableSkeletonColumn } from '@/components/kit/feedback/Skeletons';
import type { SortOption } from '@/components/kit/lists/SortControl';
import {
  defineListParams,
  enumParam,
  pageParam,
  sortParam,
  type ListState,
} from '@/lib/kit/lists/params';
import { toDescending } from '@/lib/kit/lists/sort';
import { REPORT_STATUS_ORDER } from '@/lib/kit/status/report';
import type { ReportListInput, ReportListSort } from '@/lib/orpc/schema/report';

/** Reports per page in the admin queue. */
export const ADMIN_REPORTS_PAGE_SIZE = 50;

const SORT_KEYS = [
  'created',
  'resolvedAt',
] as const satisfies readonly ReportListSort[];

/**
 * The admin queue's address: `?status=0&sort=resolvedAt&dir=asc&page=2`.
 * The status switch is always in view, so it is a scope, not a filter.
 */
export const ADMIN_REPORTS_PARAMS = defineListParams({
  status: enumParam(REPORT_STATUS_ORDER, { role: 'scope' }),
  sort: sortParam(SORT_KEYS, { key: 'created', direction: 'desc' }),
  page: pageParam(),
});

export type AdminReportsState = ListState<typeof ADMIN_REPORTS_PARAMS>;

const NEWEST_FIRST = { desc: 'Newest first', asc: 'Oldest first' } as const;

export const ADMIN_REPORT_SORT_OPTIONS: readonly SortOption<
  (typeof SORT_KEYS)[number]
>[] = [
  { value: 'created', label: 'Date submitted', directionLabels: NEWEST_FIRST },
  {
    value: 'resolvedAt',
    label: 'Date reviewed',
    directionLabels: NEWEST_FIRST,
  },
];

/** The `reports.list` input for a state of the queue. */
export function toReportListInput(state: AdminReportsState): ReportListInput {
  return {
    status: state.status,
    page: state.page,
    pageSize: ADMIN_REPORTS_PAGE_SIZE,
    ...toDescending(state.sort),
  };
}

/**
 * The queue's columns, shared by the table and its loading screen so both
 * keep the same widths. Entity and reason share the free space.
 */
export const ADMIN_REPORTS_COLUMNS = {
  id: { label: 'ID', width: 'w-16' },
  entity: { label: 'Entity' },
  reason: { label: 'Reason' },
  reporter: { label: 'Reporter', width: 'w-36', showFrom: 'lg' },
  status: { label: 'Status', width: 'w-32' },
  submitted: { label: 'Submitted', width: 'w-32', showFrom: 'lg' },
  view: { label: '', width: 'w-24', align: 'end' },
} as const satisfies Record<string, TableSkeletonColumn>;

export const ADMIN_REPORTS_SKELETON_COLUMNS: readonly TableSkeletonColumn[] =
  Object.values(ADMIN_REPORTS_COLUMNS);

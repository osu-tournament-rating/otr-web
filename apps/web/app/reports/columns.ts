import type { TableSkeletonColumn } from '@/components/kit/feedback/Skeletons';

/**
 * My reports' columns, shared by the table and its loading screen so both
 * keep the same widths. Entity and reason share the free space.
 */
export const MY_REPORTS_COLUMNS = {
  unread: { label: '', width: 'w-10' },
  entity: { label: 'Entity' },
  reason: { label: 'Reason' },
  status: { label: 'Status', width: 'w-32' },
  submitted: { label: 'Submitted', width: 'w-32', showFrom: 'lg' },
  view: { label: '', width: 'w-24', align: 'end' },
} as const satisfies Record<string, TableSkeletonColumn>;

export const MY_REPORTS_SKELETON_COLUMNS: readonly TableSkeletonColumn[] =
  Object.values(MY_REPORTS_COLUMNS);

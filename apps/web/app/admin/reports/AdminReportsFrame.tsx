import { Flag } from 'lucide-react';
import type * as React from 'react';

import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  SkeletonText,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';

import { ADMIN_REPORTS_SKELETON_COLUMNS } from './list-params';

/** The admin queue's frame and header, shared by the page and its loading screen. */
export function AdminReportsFrame({
  children,
  ...props
}: React.ComponentProps<typeof PageFrame>) {
  return (
    <PageFrame {...props}>
      <PageHeader
        icon={Flag}
        title={<span data-testid="admin-reports-heading">Data reports</span>}
        description="Review and resolve user-submitted data issue reports"
      />
      {children}
    </PageFrame>
  );
}

/** The table's skeleton rows, inside the panel while a page of reports loads. */
export function AdminReportsTableSkeleton() {
  return (
    <TableSkeleton
      columns={ADMIN_REPORTS_SKELETON_COLUMNS}
      cellHeight="h-9"
      phoneRows={<PhoneRowListSkeleton />}
    />
  );
}

/** The reports panel while the page loads, toolbar included. */
export function AdminReportsPanelSkeleton() {
  return (
    <PanelSkeleton label="Loading reports">
      <ListToolbar
        aria-hidden="true"
        label="Sort and filter reports"
        sort={
          // The shape of SortControl: the select, then its direction button.
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex">
            <SkeletonText className="block h-10 w-full md:w-48" />
            <SkeletonText className="block size-10" />
          </div>
        }
        scope={
          <SkeletonText className="block h-8 w-72 max-w-[calc(100vw-6rem)]" />
        }
        count={<SkeletonText className="h-3 w-20" />}
      />
      <AdminReportsTableSkeleton />
    </PanelSkeleton>
  );
}

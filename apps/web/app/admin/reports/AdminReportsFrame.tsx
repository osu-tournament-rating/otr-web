import { Flag } from 'lucide-react';
import type * as React from 'react';

import {
  ListToolbarSkeleton,
  PanelSkeleton,
  PhoneRowListSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';

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
        description="Review and resolve user-submitted data issue reports."
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
      phoneRows={
        // A status badge under the name, and a View button level with the name.
        <PhoneRowListSkeleton
          description="badge"
          value="button"
          align="start"
        />
      }
    />
  );
}

/** The reports panel while the page loads, toolbar included. */
export function AdminReportsPanelSkeleton() {
  return (
    <PanelSkeleton label="Loading reports">
      {/* The status switch (All, Pending, Confirmed, Dismissed), sort and
          count. The switch's buttons are narrower below `sm`. */}
      <ListToolbarSkeleton scope="w-74 sm:w-80" sort count />
      <AdminReportsTableSkeleton />
    </PanelSkeleton>
  );
}

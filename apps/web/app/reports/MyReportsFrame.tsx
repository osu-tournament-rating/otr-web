import { Flag } from 'lucide-react';
import type * as React from 'react';

import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  SectionHeaderSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';

import { MY_REPORTS_SKELETON_COLUMNS } from './columns';

/** My reports' frame and header, shared by the page and its loading screen. */
export function MyReportsFrame({
  children,
  ...props
}: React.ComponentProps<typeof PageFrame>) {
  return (
    <PageFrame {...props}>
      <PageHeader
        icon={Flag}
        title={<span data-testid="my-reports-heading">My reports</span>}
        description="Track the status of data issues you've reported"
      />
      {children}
    </PageFrame>
  );
}

/** The table's skeleton rows, inside the panel while reports load. */
export function MyReportsTableSkeleton() {
  return (
    <TableSkeleton
      columns={MY_REPORTS_SKELETON_COLUMNS}
      cellHeight="h-9"
      phoneRows={<PhoneRowListSkeleton />}
    />
  );
}

/** The reports panel while the page loads. */
export function MyReportsPanelSkeleton() {
  return (
    <PanelSkeleton label="Loading reports">
      <SectionHeaderSkeleton title="Reports" />
      <MyReportsTableSkeleton />
    </PanelSkeleton>
  );
}

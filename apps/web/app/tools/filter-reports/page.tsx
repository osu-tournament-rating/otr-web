import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FileText } from 'lucide-react';

import { FilterReportView } from '@/components/filtering/FilterReportView';
import { PanelSkeleton } from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';

export const metadata: Metadata = {
  title: 'Filter reports',
};

export default function FilterReportsPage() {
  return (
    <PageFrame>
      <PageHeader
        icon={FileText}
        title="Filter reports"
        description="View registrant filtering reports by entering a report ID."
      />
      {/* The report ID lives in the address. */}
      <Suspense fallback={<PanelSkeleton className="h-[25rem]" />}>
        <FilterReportView />
      </Suspense>
    </PageFrame>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';

import AuditEventFeed, {
  AuditFeedRowsSkeleton,
} from '@/components/audit/AuditEventFeed';
import { PanelSkeleton } from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';

export const metadata: Metadata = {
  title: 'Audit logs',
};

export default function AuditLogsPage() {
  return (
    <PageFrame data-testid="audit-logs-page">
      <PageHeader
        icon={ClipboardList}
        title={<span data-testid="audit-logs-heading">Audit logs</span>}
        description="Browse the history of changes made to tournaments, matches, games, and scores."
      />
      {/* The feed reads its filters from the address. */}
      <Suspense
        fallback={
          <PanelSkeleton label="Loading audit events">
            {/* The toolbar strip: the system events switch and Filters. */}
            <div className="box-content h-16 border-b bg-muted/20 sm:h-[4.5rem] dark:bg-muted" />
            <AuditFeedRowsSkeleton />
          </PanelSkeleton>
        }
      >
        <AuditEventFeed />
      </Suspense>
    </PageFrame>
  );
}

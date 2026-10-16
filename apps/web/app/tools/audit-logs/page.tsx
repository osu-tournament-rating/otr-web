import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';

import AuditEventFeed, {
  AuditFeedRowsSkeleton,
} from '@/components/audit/AuditEventFeed';
import {
  ListToolbarSkeleton,
  PanelSkeleton,
} from '@/components/kit/feedback/Skeletons';
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
        description="Browse the history of changes made to tournaments, matches, games, scores, and beatmaps."
      />
      {/* The feed reads its filters from the address. */}
      <Suspense
        fallback={
          <PanelSkeleton label="Loading audit events">
            {/* The toolbar strip: the system events switch and Filters. */}
            <ListToolbarSkeleton leading="w-44" filters />
            <AuditFeedRowsSkeleton />
          </PanelSkeleton>
        }
      >
        <AuditEventFeed />
      </Suspense>
    </PageFrame>
  );
}

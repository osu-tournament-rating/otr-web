import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import AuditEventFeed from '@/components/audit/AuditEventFeed';

export const metadata: Metadata = {
  title: 'Audit Logs',
};

function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-9 w-[200px]" />
      <Skeleton className="h-9 w-[140px]" />
      <Skeleton className="h-9 w-[130px]" />
      <Skeleton className="h-9 w-[140px]" />
      <Skeleton className="h-9 w-[200px]" />
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <div data-testid="audit-logs-page" className="container mx-auto py-6">
      <Card className="p-6">
        {/* Section Header */}
        <div className="mb-3 flex items-center gap-3">
          <ClipboardList className="text-primary h-6 w-6" />
          <div>
            <h1
              data-testid="audit-logs-heading"
              className="text-xl font-semibold"
            >
              Audit Logs
            </h1>
            <p className="text-muted-foreground text-sm">
              Browse the history of changes made to tournaments, matches, games,
              and scores.
            </p>
          </div>
        </div>

        <Suspense fallback={<FilterBarSkeleton />}>
          <AuditEventFeed />
        </Suspense>
      </Card>
    </div>
  );
}

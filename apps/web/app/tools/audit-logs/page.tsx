import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import AuditLogView from '@/components/audit/AuditLogView';

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
    <div className="container mx-auto flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse the history of changes made to tournaments, matches, games, and scores.
        </p>
      </div>
      <Suspense fallback={<FilterBarSkeleton />}>
        <AuditLogView />
      </Suspense>
    </div>
  );
}

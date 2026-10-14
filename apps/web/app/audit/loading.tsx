import { TimelineSkeleton } from '@/components/audit/AuditEntityTimeline';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLoading() {
  return (
    <div role="status" aria-label="Loading audit history" className="contents">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <TimelineSkeleton />
    </div>
  );
}

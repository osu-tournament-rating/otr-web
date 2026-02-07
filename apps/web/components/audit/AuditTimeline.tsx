'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { ClipboardList, Loader2 } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { AuditTimelineItem } from '@/lib/orpc/schema/audit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import AuditEntryItem from './AuditEntryItem';
import AuditNoteItem from './AuditNoteItem';
import RelativeTime from './RelativeTime';

type TimelineResponse = {
  items: AuditTimelineItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

function LoadingSkeleton() {
  return (
    <div className="border-border divide-border divide-y rounded-lg border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-4 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <ClipboardList className="text-muted-foreground/50 mb-4 h-12 w-12" />
      <h3 className="text-lg font-medium">No audit history found</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        No changes have been recorded for this entity yet.
      </p>
    </div>
  );
}

interface AuditTimelineProps {
  entityType: AuditEntityType;
  entityId: number;
}

export default function AuditTimeline({
  entityType,
  entityId,
}: AuditTimelineProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: TimelineResponse | null) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const cursor = previousPageData?.nextCursor;
      return ['audit-timeline', entityType, entityId, cursor ?? null] as const;
    },
    [entityType, entityId]
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, eType, eId, cursor]) =>
      orpc.audit.timeline({
        entityType: eType,
        entityId: eId,
        limit: 1000,
        cursor: cursor ?? undefined,
      }),
{
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 86400000, // 24 hours - audits never change
    }
  );

  const pages = data ?? [];
  const allItems = pages.flatMap((page) => page.items);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allItems.length === 0;
  const totalCount = allItems.length;

  // Find the most recent change timestamp
  const latestChange = allItems[0]?.data.created;

  useEffect(() => {
    if (typeof window === 'undefined' || !allItems.length) return;
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-primary/5');
        setTimeout(() => el.classList.remove('bg-primary/5'), 2000);
      }
    }
  }, [allItems.length]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span>
          {totalCount} change{totalCount !== 1 ? 's' : ''}
          {hasMore && '+'}
        </span>
        {latestChange && (
          <>
            <span>&middot;</span>
            <span>Last modified <RelativeTime dateString={latestChange} /></span>
          </>
        )}
      </div>

      {/* Timeline entries */}
      <div className="border-border divide-border divide-y rounded-lg border">
        {allItems.map((item) => {
          if (item.type === 'audit') {
            return <AuditEntryItem key={`a-${item.data.id}`} entry={item.data} />;
          }
          return <AuditNoteItem key={`n-${item.data.id}`} note={item.data} />;
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            {isValidating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

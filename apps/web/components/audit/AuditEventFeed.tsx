'use client';

import { useCallback, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { ClipboardList, Loader2 } from 'lucide-react';
import type { AuditEvent } from '@/lib/orpc/schema/audit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import AuditEventCard from './AuditEventCard';
import AuditFilterBar, { type FilterState } from './AuditFilterBar';

type EventFeedResponse = {
  events: AuditEvent[];
  nextCursor: string | null;
  hasMore: boolean;
};

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div
      data-testid="audit-feed-loading"
      className="border-border divide-border divide-y rounded-lg border"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <div
      data-testid="audit-feed-empty"
      className="flex flex-col items-center justify-center py-16"
    >
      <ClipboardList className="text-muted-foreground/50 mb-4 h-12 w-12" />
      <h3 className="text-lg font-medium">No audit events found</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        No audit activity has been recorded yet.
      </p>
    </div>
  );
}

export default function AuditEventFeed(): React.JSX.Element {
  const [filters, setFilters] = useState<FilterState>({
    entityTypes: [],
    fieldsChanged: [],
    showSystem: false,
    actionTypes: [],
  });

  const getKey = useCallback(
    (pageIndex: number, previousPageData: EventFeedResponse | null) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const cursor = previousPageData?.nextCursor ?? null;
      return ['audit-events', cursor, JSON.stringify(filters)] as const;
    },
    [filters]
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, cursor]) =>
      orpc.audit.events({
        limit: 30,
        cursor: cursor ?? undefined,
        showSystem: filters.showSystem ? true : undefined,
        entityTypes:
          filters.entityTypes.length > 0 ? filters.entityTypes : undefined,
        fieldsChanged:
          filters.fieldsChanged.length > 0 ? filters.fieldsChanged : undefined,
        actionTypes:
          filters.actionTypes.length > 0 ? filters.actionTypes : undefined,
      }),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    }
  );

  const pages = data ?? [];
  const allEvents = pages.flatMap((page) => page.events);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allEvents.length === 0;

  return (
    <div data-testid="audit-event-feed" className="flex flex-col gap-4">
      <AuditFilterBar filters={filters} onChange={setFilters} />

      {/* Event list */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <div
            data-testid="audit-event-list"
            className="border-border divide-border divide-y rounded-lg border"
          >
            {allEvents.map((event) => (
              <AuditEventCard
                key={`${event.created}-${event.actionUserId}-${event.topEntity.entityType}-${event.topEntity.entityId}`}
                event={event}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                data-testid="audit-load-more"
                variant="outline"
                size="sm"
                onClick={() => setSize(size + 1)}
                disabled={isValidating}
              >
                {isValidating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

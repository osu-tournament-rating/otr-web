'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { ClipboardList, Loader2 } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { EntityTimelineItem } from '@/lib/orpc/schema/audit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import AuditEntryRow from './AuditEntryRow';
import AuditNoteItem from './AuditNoteItem';
import RelativeTime from './RelativeTime';

type TimelineResponse = {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  items: EntityTimelineItem[];
};

export function TimelineSkeleton(): React.JSX.Element {
  return (
    <div
      data-testid="audit-timeline-loading"
      className="divide-y divide-border rounded-lg border border-border"
    >
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

export function TimelineEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div
      data-testid="audit-timeline-empty"
      className="flex flex-col items-center justify-center py-16"
    >
      <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function TimelineSummary({
  total,
  hasMore,
  latestChange,
  capped,
}: {
  total: number;
  hasMore: boolean;
  latestChange: string | null;
  capped?: boolean;
}): React.JSX.Element {
  return (
    <div
      data-testid="timeline-summary"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span>
        {total} change{total !== 1 ? 's' : ''}
        {(hasMore || capped) && '+'}
      </span>
      {latestChange && (
        <>
          <span>&middot;</span>
          <span>
            Last modified <RelativeTime dateString={latestChange} />
          </span>
        </>
      )}
    </div>
  );
}

export function LoadMoreButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex justify-center pt-2">
      <Button
        data-testid="timeline-load-more"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={disabled}
      >
        {disabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}

type AuditEntityTimelineProps = {
  entityType: AuditEntityType;
  entityId: number;
  showSystem?: boolean;
};

export default function AuditEntityTimeline({
  entityType,
  entityId,
  showSystem = false,
}: AuditEntityTimelineProps): React.JSX.Element {
  const scrollTargetRef = useRef(false);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: TimelineResponse | null) => {
      if (previousPageData && pageIndex >= previousPageData.pages) return null;
      return [
        'audit-entity-timeline',
        entityType,
        entityId,
        showSystem,
        pageIndex + 1,
      ] as const;
    },
    [entityType, entityId, showSystem]
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, eType, eId, withSystem, page]) =>
      orpc.audit.timeline({
        entityType: eType,
        entityId: eId,
        showSystem: withSystem,
        pageSize: 50,
        page,
      }),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300_000,
    }
  );

  const responsePages = data ?? [];
  const allItems = responsePages.flatMap((p) => p.items);
  const totalPages = responsePages[0]?.pages ?? 0;
  const hasMore = size < totalPages;
  const isEmpty = !isLoading && allItems.length === 0;
  const totalCount = responsePages[0]?.total ?? allItems.length;

  const firstItem = allItems[0] ?? null;
  const latestChange = firstItem
    ? firstItem.type === 'audit'
      ? firstItem.data.entry.created
      : firstItem.data.created
    : null;

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !allItems.length ||
      scrollTargetRef.current
    )
      return;
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        scrollTargetRef.current = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-primary/5');
        const timer = setTimeout(
          () => el.classList.remove('bg-primary/5'),
          2000
        );
        return () => clearTimeout(timer);
      }
    }
  }, [allItems.length]);

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (isEmpty) {
    return (
      <TimelineEmptyState
        title="No audit history found"
        description={
          showSystem
            ? 'No changes have been recorded for this entity yet.'
            : 'No manual changes have been recorded. Enable system events to see automated processing.'
        }
      />
    );
  }

  return (
    <div data-testid="audit-timeline" className="space-y-4">
      <TimelineSummary
        total={totalCount}
        hasMore={hasMore}
        latestChange={latestChange}
      />

      <div
        data-testid="timeline-entry-list"
        className="divide-y divide-border rounded-lg border border-border"
      >
        {allItems.map((item) => {
          if (item.type === 'audit') {
            return (
              <AuditEntryRow
                key={`a-${item.data.entry.id}`}
                entry={item.data.entry}
                cascadeContext={item.data.cascadeContext}
                viewedEntity={{ entityType, entityId }}
              />
            );
          }
          return <AuditNoteItem key={`n-${item.data.id}`} note={item.data} />;
        })}
      </div>

      {hasMore && (
        <LoadMoreButton
          onClick={() => setSize(size + 1)}
          disabled={isValidating}
        />
      )}
    </div>
  );
}

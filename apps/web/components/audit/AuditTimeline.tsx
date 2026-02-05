'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Loader2 } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { AuditTimelineItem } from '@/lib/orpc/schema/audit';
import { Button } from '@/components/ui/button';
import { orpc } from '@/lib/orpc/orpc';
import AuditEntryItem from './AuditEntryItem';
import AuditNoteItem from './AuditNoteItem';

type TimelineResponse = {
  items: AuditTimelineItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

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
        limit: 50,
        cursor: cursor ?? undefined,
      }),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    }
  );

  const pages = data ?? [];
  const allItems = pages.flatMap((page) => page.items);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allItems.length === 0;

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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        No audit history found.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {allItems.map((item) => {
        if (item.type === 'audit') {
          return <AuditEntryItem key={`a-${item.data.id}`} entry={item.data} />;
        }
        return <AuditNoteItem key={`n-${item.data.id}`} note={item.data} />;
      })}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
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

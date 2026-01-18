'use client';

import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';

import { orpc } from '@/lib/orpc/orpc';
import {
  PropertyFilter,
  TournamentTimelineAudit,
  TournamentTimelineInput,
} from '@/lib/orpc/schema/audit';
import { Skeleton } from '@/components/ui/skeleton';
import AuditActionBadge from '../AuditActionBadge';
import AuditActorBadge from '../AuditActorBadge';
import AuditEntityBadge from '../AuditEntityBadge';
import AuditChangesDisplay from '../AuditChangesDisplay';

interface TournamentTimelinePanelProps {
  tournamentId: number | null;
  changedProperties?: PropertyFilter[];
}

const PAGE_SIZE = 50;

function getKey(tournamentId: number, changedProperties?: PropertyFilter[]) {
  return (
    pageIndex: number,
    previousPageData: {
      audits: TournamentTimelineAudit[];
      nextCursor: number | null;
      hasMore: boolean;
    } | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const cursor =
      pageIndex === 0 ? undefined : (previousPageData?.nextCursor ?? undefined);
    return {
      tournamentId,
      cursor,
      limit: PAGE_SIZE,
      changedProperties,
    };
  };
}

export default function TournamentTimelinePanel({
  tournamentId,
  changedProperties,
}: TournamentTimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite(
      tournamentId ? getKey(tournamentId, changedProperties) : () => null,
      (params) =>
        orpc.audits.tournamentTimeline(params as TournamentTimelineInput),
      {
        revalidateOnFocus: false,
        revalidateFirstPage: false,
      }
    );

  useEffect(() => {
    mutate();
  }, [changedProperties, mutate]);

  const audits = data?.flatMap((page) => page.audits) ?? [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isValidating) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200 && hasMore) {
      setSize(size + 1);
    }
  }, [hasMore, isValidating, setSize, size]);

  if (!tournamentId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select a tournament to view its timeline
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {audits.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-muted-foreground">No audit records found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {audits.map((audit) => (
              <TimelineItem
                key={`${audit.entityType}-${audit.id}`}
                audit={audit}
              />
            ))}
            {isValidating && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ audit }: { audit: TournamentTimelineAudit }) {
  return (
    <div className="hover:bg-muted/50 group rounded-md border p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AuditEntityBadge entityType={audit.entityType} />
          <AuditActionBadge actionType={audit.actionType} />
        </div>
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(audit.created), { addSuffix: true })}
        </span>
      </div>

      <div className="mt-2">
        <p className="text-sm font-medium">{audit.entityDisplayName}</p>
        {audit.parentEntityName && (
          <p className="text-muted-foreground text-xs">
            in {audit.parentEntityName}
          </p>
        )}
      </div>

      <div className="mt-2">
        <AuditActorBadge actor={audit.actor} />
      </div>

      {audit.changes && Object.keys(audit.changes).length > 0 && (
        <div className="mt-2">
          <AuditChangesDisplay changes={audit.changes} maxItems={3} />
        </div>
      )}
    </div>
  );
}

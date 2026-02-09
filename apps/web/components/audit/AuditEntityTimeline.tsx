'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import {
  ChevronRight,
  ClipboardList,
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import type {
  EntityTimelineEvent,
  EntityTimelineItem,
} from '@/lib/orpc/schema/audit';
import {
  AuditActionTypeEnumHelper,
} from '@/lib/enums';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { orpc } from '@/lib/orpc/orpc';
import AuditDiffDisplay from './AuditDiffDisplay';
import AuditNoteItem from './AuditNoteItem';
import CascadeContextBanner from './CascadeContextBanner';
import RelativeTime from './RelativeTime';

// --- Constants ---

type TimelineResponse = {
  items: EntityTimelineItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

const ACTION_ICONS: Record<AuditActionType, typeof PlusCircle> = {
  [AuditActionType.Created]: PlusCircle,
  [AuditActionType.Updated]: Pencil,
  [AuditActionType.Deleted]: Trash2,
};

const ACTION_ICON_COLORS: Record<AuditActionType, string> = {
  [AuditActionType.Created]: 'text-green-500',
  [AuditActionType.Updated]: 'text-blue-500',
  [AuditActionType.Deleted]: 'text-red-500',
};

const ACTION_BADGE_COLORS: Record<AuditActionType, string> = {
  [AuditActionType.Created]:
    'bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/15',
  [AuditActionType.Updated]:
    'bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/15',
  [AuditActionType.Deleted]:
    'bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/15',
};

// --- Sub-components ---

function LoadingSkeleton(): React.JSX.Element {
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

function EmptyState(): React.JSX.Element {
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

function TimelineAuditEntry({
  timelineEvent,
}: {
  timelineEvent: EntityTimelineEvent;
}): React.JSX.Element {
  const { entry, cascadeContext } = timelineEvent;
  const actionMeta = AuditActionTypeEnumHelper.getMetadata(entry.actionType);
  const changes = entry.changes as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  > | null;
  const changeCount = changes ? Object.keys(changes).length : 0;
  const [isOpen, setIsOpen] = useState(changeCount > 0 && changeCount < 10);

  const ActionIcon = ACTION_ICONS[entry.actionType];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        id={`audit-${entry.id}`}
        className={cn(
          'border-border group border-b transition-colors',
          isOpen ? 'bg-muted/30' : 'hover:bg-accent/50'
        )}
      >
        {/* Cascade context banner */}
        {cascadeContext && (
          <div className="px-3 pt-2">
            <CascadeContextBanner context={cascadeContext} />
          </div>
        )}

        <CollapsibleTrigger asChild disabled={changeCount === 0}>
          <button
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left',
              changeCount === 0 && 'cursor-default'
            )}
          >
            {/* Action Icon */}
            <ActionIcon
              className={cn(
                'h-4 w-4 shrink-0',
                ACTION_ICON_COLORS[entry.actionType]
              )}
            />

            {/* Action Badge */}
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 text-xs',
                ACTION_BADGE_COLORS[entry.actionType]
              )}
            >
              {actionMeta.text}
            </Badge>

            {/* User */}
            <span className="flex items-center gap-1.5 text-sm">
              {entry.actionUser ? (
                <>
                  {entry.actionUser.osuId ? (
                    <OsuAvatar
                      osuId={entry.actionUser.osuId}
                      username={entry.actionUser.username}
                      size={20}
                    />
                  ) : (
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {entry.actionUser.username?.[0]?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <Link
                    href={`/players/${entry.actionUser.playerId}`}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entry.actionUser.username ?? `User ${entry.actionUser.id}`}
                  </Link>
                </>
              ) : (
                <span className="text-muted-foreground italic">System</span>
              )}
            </span>

            {/* Spacer */}
            <span className="flex-1" />

            {/* Change count indicator */}
            {changeCount > 0 && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
                {changeCount} field{changeCount !== 1 ? 's' : ''} changed
              </span>
            )}

            {/* Timestamp */}
            <RelativeTime
              dateString={entry.created}
              className="text-muted-foreground shrink-0 text-xs"
            />
          </button>
        </CollapsibleTrigger>

        {/* Expanded diffs */}
        <CollapsibleContent>
          {changes && changeCount > 0 && (
            <div className="bg-muted/20 border-border border-t px-3 py-2">
              <div className="flex flex-col gap-1 pl-7">
                {Object.entries(changes).map(([fieldName, change]) => (
                  <AuditDiffDisplay
                    key={fieldName}
                    fieldName={fieldName}
                    change={change}
                    entityType={entry.entityType}
                    referencedUsers={entry.referencedUsers}
                  />
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// --- Main component ---

type AuditEntityTimelineProps = {
  entityType: AuditEntityType;
  entityId: number;
};

export default function AuditEntityTimeline({
  entityType,
  entityId,
}: AuditEntityTimelineProps): React.JSX.Element {
  const scrollTargetRef = useRef(false);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: TimelineResponse | null) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const cursor = previousPageData?.nextCursor ?? null;
      return [
        'audit-entity-timeline',
        entityType,
        entityId,
        cursor,
      ] as const;
    },
    [entityType, entityId]
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, eType, eId, cursor]) =>
      orpc.audit.timeline({
        entityType: eType,
        entityId: eId,
        limit: 250,
        cursor: cursor ?? undefined,
      }),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 86_400_000,
    }
  );

  const pages = data ?? [];
  const allItems = pages.flatMap((page) => page.items);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allItems.length === 0;
  const totalCount = allItems.length;

  // Find the most recent change timestamp
  const firstItem = allItems[0] ?? null;
  const latestChange = firstItem
    ? firstItem.type === 'audit'
      ? firstItem.data.entry.created
      : firstItem.data.created
    : null;

  // Scroll to hash target on initial load
  useEffect(() => {
    if (typeof window === 'undefined' || !allItems.length || scrollTargetRef.current) return;
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        scrollTargetRef.current = true;
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
            <span>
              Last modified <RelativeTime dateString={latestChange} />
            </span>
          </>
        )}
      </div>

      {/* Timeline entries */}
      <div className="border-border divide-border divide-y rounded-lg border">
        {allItems.map((item) => {
          if (item.type === 'audit') {
            return (
              <TimelineAuditEntry
                key={`a-${item.data.entry.id}`}
                timelineEvent={item.data}
              />
            );
          }
          return (
            <AuditNoteItem key={`n-${item.data.id}`} note={item.data} />
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
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
  );
}

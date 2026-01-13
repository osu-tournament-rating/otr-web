'use client';

import { format } from 'date-fns';
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite';
import { Fetcher } from 'swr';
import { cn } from '@/lib/utils';

import { AuditActionType, ReportEntityType } from '@otr/core/osu';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import {
  AuditEntityHistoryInput,
  AuditListResponse,
  AuditRecord,
} from '@/lib/orpc/schema/audit';

import AuditActorBadge from './AuditActorBadge';
import AuditActionBadge from './AuditActionBadge';
import AuditChangesDisplay from './AuditChangesDisplay';

const ACTION_COLORS = {
  [AuditActionType.Insert]: 'bg-green-500 dark:bg-green-600',
  [AuditActionType.Update]: 'bg-blue-500 dark:bg-blue-600',
  [AuditActionType.Delete]: 'bg-red-500 dark:bg-red-600',
} as const;

function TimelineItem({ audit }: { audit: AuditRecord }) {
  const dotColor = ACTION_COLORS[audit.actionType];

  return (
    <div className="relative flex gap-4 first:pt-0 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={cn('h-3 w-3 rounded-full', dotColor)} />
        <div className="bg-border w-px flex-1" />
      </div>
      <div className="flex-1 space-y-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <AuditActorBadge actor={audit.actor} />
          <AuditActionBadge actionType={audit.actionType} />
        </div>
        <p className="text-muted-foreground text-xs">
          {format(new Date(audit.created), 'PPpp')}
        </p>
        {audit.actionType === AuditActionType.Update && audit.changes && (
          <AuditChangesDisplay changes={audit.changes} maxItems={2} />
        )}
      </div>
    </div>
  );
}

const INITIAL_PAGE_SIZE = 20;
const LOAD_MORE_SIZE = 100;

const fetcher = (): Fetcher<AuditListResponse, AuditEntityHistoryInput> => {
  return async (params) => await orpc.audits.history(params);
};

const getKey = (
  entityType: ReportEntityType,
  referenceIdLock: number
): SWRInfiniteKeyLoader<AuditListResponse, AuditEntityHistoryInput | null> => {
  return (index, previous) => {
    if (previous && !previous.hasMore) {
      return null;
    }

    const cursor =
      index === 0 ? undefined : (previous?.nextCursor ?? undefined);
    const limit = index === 0 ? INITIAL_PAGE_SIZE : LOAD_MORE_SIZE;

    return {
      entityType,
      referenceIdLock,
      cursor,
      limit,
    };
  };
};

export default function AuditTimeline({
  entityType,
  referenceIdLock,
}: {
  entityType: ReportEntityType;
  referenceIdLock: number;
}) {
  const { data, error, isLoading, setSize, isValidating } = useSWRInfinite(
    getKey(entityType, referenceIdLock),
    fetcher(),
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    }
  );

  const audits: AuditRecord[] = data ? data.flatMap((d) => d.audits) : [];
  const hasMore = data?.at(-1)?.hasMore ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Audit History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="flex gap-4">
                <Skeleton className="h-3 w-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-muted-foreground text-sm">
            Failed to load audit history.
          </p>
        )}

        {data && audits.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No audit history found.
          </p>
        )}

        {data && audits.length > 0 && (
          <div>
            {audits.map((audit) => (
              <TimelineItem key={audit.id} audit={audit} />
            ))}
            {hasMore && (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setSize((size) => size + 1)}
                disabled={isValidating}
              >
                {isValidating ? 'Loading...' : 'Show more'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { format } from 'date-fns';
import useSWR from 'swr';
import { cn } from '@/lib/utils';

import { AuditActionType, ReportEntityType } from '@otr/core/osu';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import { AuditRecord } from '@/lib/orpc/schema/audit';

import AuditActorBadge from './AuditActorBadge';
import AuditActionBadge from './AuditActionBadge';

const ACTION_COLORS = {
  [AuditActionType.Insert]:
    'bg-green-500 dark:bg-green-600',
  [AuditActionType.Update]:
    'bg-blue-500 dark:bg-blue-600',
  [AuditActionType.Delete]:
    'bg-red-500 dark:bg-red-600',
} as const;

function TimelineItem({
  audit,
  isHighlighted,
}: {
  audit: AuditRecord;
  isHighlighted: boolean;
}) {
  const dotColor = ACTION_COLORS[audit.actionType];

  return (
    <div
      className={cn(
        'relative flex gap-4 pb-6 last:pb-0',
        isHighlighted && 'bg-primary/5 -mx-4 rounded-lg px-4 py-2'
      )}
    >
      <div className="flex flex-col items-center">
        <div className={cn('h-3 w-3 rounded-full', dotColor)} />
        <div className="bg-border w-px flex-1" />
      </div>
      <div className="flex-1 space-y-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <AuditActorBadge actor={audit.actor} />
          <AuditActionBadge actionType={audit.actionType} />
          {isHighlighted && (
            <span className="text-primary text-xs font-medium">(current)</span>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {format(new Date(audit.created), 'PPpp')}
        </p>
        {audit.changes && Object.keys(audit.changes).length > 0 && (
          <p className="text-muted-foreground text-xs">
            {Object.keys(audit.changes).length} field
            {Object.keys(audit.changes).length !== 1 ? 's' : ''} changed
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuditTimeline({
  entityType,
  referenceIdLock,
  currentAuditId,
}: {
  entityType: ReportEntityType;
  referenceIdLock: number;
  currentAuditId: number;
}) {
  const { data, error, isLoading } = useSWR(
    ['audit-history', entityType, referenceIdLock],
    () =>
      orpc.audits.history({
        entityType,
        referenceIdLock,
        limit: 50,
      }),
    {
      revalidateOnFocus: false,
    }
  );

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

        {data && data.audits.length === 0 && (
          <p className="text-muted-foreground text-sm">No audit history found.</p>
        )}

        {data && data.audits.length > 0 && (
          <div>
            {data.audits.map((audit) => (
              <TimelineItem
                key={audit.id}
                audit={audit}
                isHighlighted={audit.id === currentAuditId}
              />
            ))}
            {data.hasMore && (
              <p className="text-muted-foreground mt-4 text-center text-xs">
                More history available...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

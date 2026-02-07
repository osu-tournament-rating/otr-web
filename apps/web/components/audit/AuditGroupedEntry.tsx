'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AuditActionType } from '@otr/core/osu';
import {
  AuditEntityTypeEnumHelper,
  AuditActionTypeEnumHelper,
} from '@/lib/enums';
import type { AuditGroupSummary } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { orpc } from '@/lib/orpc/orpc';
import AuditEntryItem from './AuditEntryItem';
import { getFieldLabel } from './auditFieldConfig';
import RelativeTime from './RelativeTime';

const actionIcons: Record<AuditActionType, typeof PlusCircle> = {
  [AuditActionType.Created]: PlusCircle,
  [AuditActionType.Updated]: Pencil,
  [AuditActionType.Deleted]: Trash2,
};

const actionIconColors: Record<AuditActionType, string> = {
  [AuditActionType.Created]: 'text-green-500',
  [AuditActionType.Updated]: 'text-blue-500',
  [AuditActionType.Deleted]: 'text-red-500',
};

const actionBorderColors: Record<AuditActionType, string> = {
  [AuditActionType.Created]: 'border-l-green-500',
  [AuditActionType.Updated]: 'border-l-blue-500',
  [AuditActionType.Deleted]: 'border-l-red-500',
};

function getUserInitials(username: string | null | undefined): string {
  if (!username) return '?';
  return username
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  const lower = word.toLowerCase();
  if (lower.endsWith('ch') || lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/** Lazy-loaded entry list for a group summary */
function GroupEntryList({ group }: { group: AuditGroupSummary }) {
  const { data, isLoading } = useSWR(
    [
      'group-entries',
      group.entityType,
      group.actionUserId,
      group.actionType,
      group.timeBucket,
      group.changedFieldsKey,
    ],
    () =>
      orpc.audit.activityEntries({
        entityType: group.entityType,
        actionUserId: group.actionUserId,
        actionType: group.actionType,
        timeBucket: group.timeBucket,
        changedFieldsKey: group.changedFieldsKey,
        limit: 50,
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 86400000,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!data?.entries.length) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        No entries found
      </div>
    );
  }

  return (
    <>
      {data.entries.map((entry) => (
        <AuditEntryItem key={entry.id} entry={entry} showEntityInfo />
      ))}
    </>
  );
}

export default function AuditGroupedEntry({
  group,
  compact = false,
  alwaysExpanded = false,
}: {
  group: AuditGroupSummary;
  compact?: boolean;
  alwaysExpanded?: boolean;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const entityMeta = AuditEntityTypeEnumHelper.getMetadata(group.entityType);
  const actionMeta = AuditActionTypeEnumHelper.getMetadata(group.actionType);
  const ActionIcon = actionIcons[group.actionType];
  const showFieldLabels = group.actionType === AuditActionType.Updated;
  const fieldLabels = showFieldLabels
    ? group.changedFields.map((f) => getFieldLabel(group.entityType, f)).join(', ')
    : '';

  const username = group.actionUser?.username;
  const initials = getUserInitials(username);

  // When alwaysExpanded, render lazy-loaded entries directly without collapsible header
  if (alwaysExpanded) {
    return (
      <div className="border-border divide-border divide-y rounded-lg border">
        <GroupEntryList group={group} />
      </div>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className={cn(
          'overflow-hidden rounded-lg border border-l-4 transition-colors',
          actionBorderColors[group.actionType],
          expanded ? 'bg-card border-border' : 'border-border/50 hover:border-border hover:bg-card/50',
          compact && 'border-l-2'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className={cn(
            'flex w-full items-center gap-3 text-left',
            compact ? 'p-2' : 'px-4 py-3'
          )}>
            {/* User Avatar - hidden in compact mode */}
            {!compact && (
              group.actionUser?.osuId ? (
                <OsuAvatar
                  osuId={group.actionUser.osuId}
                  username={username}
                  size={36}
                  className="shrink-0"
                />
              ) : (
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )
            )}

            {/* Content */}
            <div className={cn(
              'flex min-w-0 flex-1 flex-col gap-1',
              compact && 'flex-row flex-wrap items-center gap-x-1.5 gap-y-0.5'
            )}>
              {/* Primary line: User + action */}
              {!compact && (
                <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                  {group.actionUser ? (
                    <Link
                      href={`/players/${group.actionUser.playerId}`}
                      className="text-primary font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {username ?? `User ${group.actionUser.id}`}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground italic">System</span>
                  )}
                  <span className="text-muted-foreground">
                    {actionMeta.text.toLowerCase()}
                  </span>
                  {fieldLabels && (
                    <span className="text-foreground font-medium">
                      {fieldLabels}
                    </span>
                  )}
                </div>
              )}

              {/* Secondary line: Entity count badge */}
              <div className={cn('flex items-center gap-2', compact && 'text-xs')}>
                {compact && fieldLabels && (
                  <span className="text-muted-foreground">{fieldLabels}</span>
                )}
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <ActionIcon className={cn('h-3 w-3', actionIconColors[group.actionType])} />
                  {group.count} {pluralize(entityMeta.text.toLowerCase(), group.count)}
                </Badge>
              </div>
            </div>

            {/* Timestamp and expand indicator */}
            <div className="flex shrink-0 items-center gap-2">
              <RelativeTime
                dateString={group.latestCreated}
                className="text-muted-foreground text-xs"
              />
              <ChevronRight
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  expanded && 'rotate-90'
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="bg-muted/20 border-border border-t">
            <GroupEntryList group={group} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

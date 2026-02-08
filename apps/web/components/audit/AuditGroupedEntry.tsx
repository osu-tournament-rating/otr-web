'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
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

/** Get tournament context for display when a group has a parent tournament */
function getTournamentContext(group: AuditGroupSummary): {
  name: string;
  href: string;
} | null {
  if (!group.tournamentName || !group.parentEntityId) return null;
  // Don't show tournament context for tournament-type groups (redundant)
  if (group.entityType === AuditEntityType.Tournament) return null;
  return {
    name: group.tournamentName,
    href: `/tournaments/${group.parentEntityId}`,
  };
}

/** Get entity identifier for display when a group represents a single entity */
function getEntityIdentifier(group: AuditGroupSummary): {
  prefix?: string;
  name: string;
  href: string;
} | null {
  if (group.count !== 1) return null;

  const id = group.sampleReferenceIdLock;
  switch (group.entityType) {
    case AuditEntityType.Tournament:
      return group.tournamentName
        ? { prefix: 'tournament', name: group.tournamentName, href: `/tournaments/${id}` }
        : { name: `tournament #${id}`, href: `/tournaments/${id}` };
    case AuditEntityType.Match:
      return { name: `match #${id}`, href: `/matches/${id}` };
    case AuditEntityType.Game:
      return { name: `game #${id}`, href: `/audit/games/${id}` };
    case AuditEntityType.Score:
      return { name: `score #${id}`, href: `/audit/scores/${id}` };
  }
}

/** Lazy-loaded entry list for a group summary */
function GroupEntryList({ group }: { group: AuditGroupSummary }) {
  const { data, isLoading } = useSWR(
    [
      'group-entries',
      group.entityType,
      group.actionUserId,
      group.actionType,
      group.parentEntityId,
      group.changedFieldsKey,
    ],
    () =>
      orpc.audit.activityEntries({
        entityType: group.entityType,
        actionUserId: group.actionUserId,
        actionType: group.actionType,
        parentEntityId: group.parentEntityId,
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
  const showFieldCount = group.actionType === AuditActionType.Updated;
  const fieldCount = showFieldCount ? group.changedFields.length : 0;

  const username = group.actionUser?.username;
  const initials = getUserInitials(username);
  const entityId = getEntityIdentifier(group);
  const tournamentContext = getTournamentContext(group);

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
            compact ? 'p-2' : 'p-3'
          )}>
            {/* User Avatar - hidden in compact mode */}
            {!compact && (
              group.actionUser?.osuId ? (
                <OsuAvatar
                  osuId={group.actionUser.osuId}
                  username={username}
                  size={32}
                  className="shrink-0"
                />
              ) : (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )
            )}

            {/* Content */}
            <div className={cn(
              'flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {!compact && (
                <>
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
                  {entityId && (
                    <>
                      {entityId.prefix && (
                        <span className="text-muted-foreground">{entityId.prefix}</span>
                      )}
                      <Link
                        href={entityId.href}
                        className="text-foreground font-medium hover:text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entityId.name}
                      </Link>
                      {tournamentContext && (
                        <>
                          <span className="text-muted-foreground">in</span>
                          <Link
                            href={tournamentContext.href}
                            className="text-foreground font-medium hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tournamentContext.name}
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              {compact && fieldLabels && (
                <span className="text-muted-foreground">{fieldLabels}</span>
              )}
              {(!entityId || compact) && (
                <>
                  <Badge variant="secondary" className="gap-1.5 font-normal">
                    <ActionIcon className={cn('h-3 w-3', actionIconColors[group.actionType])} />
                    {group.count} {pluralize(entityMeta.text.toLowerCase(), group.count)}
                  </Badge>
                  {tournamentContext && (
                    <>
                      <span className="text-muted-foreground">in</span>
                      <Link
                        href={tournamentContext.href}
                        className="text-foreground font-medium hover:text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tournamentContext.name}
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Timestamp and expand indicator */}
            <div className="flex shrink-0 items-center gap-2">
              {fieldCount > 0 && (
                <span className="text-muted-foreground text-xs">
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''} changed
                </span>
              )}
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

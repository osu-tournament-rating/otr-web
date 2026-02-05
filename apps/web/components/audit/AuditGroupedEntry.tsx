'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AuditActionType } from '@otr/core/osu';
import {
  AuditEntityTypeEnumHelper,
  AuditActionTypeEnumHelper,
} from '@/lib/enums';
import type { AuditGroupedEntry as AuditGroupedEntryType } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AuditEntryItem from './AuditEntryItem';
import { getFieldLabel } from './auditFieldConfig';
import { formatRelativeTime } from './formatRelativeTime';

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
  // Handle irregular: match → matches, game → games
  if (lower.endsWith('ch') || lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

export default function AuditGroupedEntry({
  group,
}: {
  group: AuditGroupedEntryType;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const entityMeta = AuditEntityTypeEnumHelper.getMetadata(group.entityType);
  const actionMeta = AuditActionTypeEnumHelper.getMetadata(group.actionType);
  const ActionIcon = actionIcons[group.actionType];
  // Only show changed fields for Updated actions - Created/Deleted change all fields
  const showFieldLabels = group.actionType === AuditActionType.Updated;
  const fieldLabels = showFieldLabels
    ? group.changedFields.map((f) => getFieldLabel(group.entityType, f)).join(', ')
    : '';

  const username = group.actionUser?.username;
  const initials = getUserInitials(username);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className={cn(
          'border-border overflow-hidden rounded-lg border transition-colors',
          expanded ? 'bg-card' : 'hover:bg-accent/30'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3 text-left">
            {/* User Avatar */}
            {group.actionUser?.osuId ? (
              <OsuAvatar
                osuId={group.actionUser.osuId}
                username={username}
                size={32}
                className="shrink-0"
              />
            ) : (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
              {/* User link */}
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

              {/* Action description */}
              <span className="text-muted-foreground">
                {actionMeta.text.toLowerCase()}
              </span>
              {fieldLabels && (
                <span className="text-muted-foreground">{fieldLabels} on</span>
              )}

              {/* Count badge */}
              <Badge variant="secondary" className="gap-1 font-normal">
                <ActionIcon className={cn('h-3 w-3', actionIconColors[group.actionType])} />
                {group.count} {pluralize(entityMeta.text.toLowerCase(), group.count)}
              </Badge>
            </div>

            {/* Timestamp and expand indicator */}
            <div className="flex shrink-0 items-center gap-2">
              <time
                className="text-muted-foreground text-xs"
                dateTime={group.latestCreated}
              >
                {formatRelativeTime(group.latestCreated)}
              </time>
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
          <div className="bg-muted/30 border-border border-t">
            {group.entries.map((entry) => (
              <AuditEntryItem key={entry.id} entry={entry} showEntityInfo />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

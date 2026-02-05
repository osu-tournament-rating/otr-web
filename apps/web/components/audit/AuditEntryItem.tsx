'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AuditActionType } from '@otr/core/osu';
import { entityTypeToSlug } from '@/app/server/oRPC/procedures/audit/helpers';
import {
  AuditActionTypeEnumHelper,
  AuditEntityTypeEnumHelper,
} from '@/lib/enums';
import type { AuditEntry } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AuditDiffDisplay from './AuditDiffDisplay';
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

const actionBadgeColors: Record<AuditActionType, string> = {
  [AuditActionType.Created]: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  [AuditActionType.Updated]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  [AuditActionType.Deleted]: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

export default function AuditEntryItem({
  entry,
  showEntityInfo = false,
}: {
  entry: AuditEntry;
  showEntityInfo?: boolean;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const actionMeta = AuditActionTypeEnumHelper.getMetadata(entry.actionType);
  const entityMeta = AuditEntityTypeEnumHelper.getMetadata(entry.entityType);
  const changes = entry.changes as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  > | null;
  const slug = entityTypeToSlug(entry.entityType);
  const ActionIcon = actionIcons[entry.actionType];
  const changeCount = changes ? Object.keys(changes).length : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        id={`audit-${entry.id}`}
        className={cn(
          'border-border group border-b transition-colors',
          isOpen ? 'bg-muted/30' : 'hover:bg-accent/50'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
            {/* Action Icon */}
            <ActionIcon
              className={cn('h-4 w-4 shrink-0', actionIconColors[entry.actionType])}
            />

            {/* Action Badge */}
            <Badge
              variant="outline"
              className={cn('shrink-0 text-xs', actionBadgeColors[entry.actionType])}
            >
              {actionMeta.text}
            </Badge>

            {/* Entity Info */}
            {showEntityInfo && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <span>{entityMeta.text}</span>
                <Link
                  href={`/audit/${slug}/${entry.referenceIdLock}`}
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{entry.referenceIdLock}
                </Link>
              </span>
            )}

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
            <time
              className="text-muted-foreground shrink-0 text-xs"
              dateTime={entry.created}
              title={new Date(entry.created).toLocaleString()}
            >
              {formatRelativeTime(entry.created)}
            </time>
          </button>
        </CollapsibleTrigger>

        {/* Changes */}
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  AuditEntityTypeEnumHelper,
  AuditActionTypeEnumHelper,
} from '@/lib/enums';
import type { AuditGroupedEntry as AuditGroupedEntryType } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import AuditEntryItem from './AuditEntryItem';
import { getFieldLabel } from './auditFieldConfig';
import { formatRelativeTime } from './formatRelativeTime';

export default function AuditGroupedEntry({
  group,
}: {
  group: AuditGroupedEntryType;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const entityMeta = AuditEntityTypeEnumHelper.getMetadata(group.entityType);
  const actionMeta = AuditActionTypeEnumHelper.getMetadata(group.actionType);
  const fieldLabels = group.changedFields
    .map((f) => getFieldLabel(group.entityType, f))
    .join(', ');

  return (
    <div className="border-border border-l-2 py-2 pl-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left text-sm"
      >
        <ChevronRight
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform',
            expanded && 'rotate-90'
          )}
        />
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {group.actionUser ? (
            <Link
              href={`/players/${group.actionUser.playerId}`}
              className="text-primary font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {group.actionUser.username ?? `User ${group.actionUser.id}`}
            </Link>
          ) : (
            <span className="text-muted-foreground italic">System</span>
          )}
          <span className="text-muted-foreground">
            {actionMeta.text.toLowerCase()}
          </span>
          {fieldLabels && (
            <span className="text-muted-foreground">{fieldLabels} on</span>
          )}
          <span className="font-medium">
            {group.count} {entityMeta.text.toLowerCase()}
            {group.count !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">&middot;</span>
          <time className="text-muted-foreground" dateTime={group.latestCreated}>
            {formatRelativeTime(group.latestCreated)}
          </time>
        </div>
      </button>

      {expanded && (
        <div className="ml-4 mt-2 space-y-0">
          {group.entries.map((entry) => (
            <AuditEntryItem key={entry.id} entry={entry} showEntityInfo />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ShieldCheck, ShieldX, Layers } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { BatchOperation, BatchOperationType } from './batchDetection';
import AuditGroupedEntry from './AuditGroupedEntry';
import { formatRelativeTime } from './formatRelativeTime';

const operationConfig: Record<
  BatchOperationType,
  {
    icon: typeof ShieldCheck;
    label: string;
    borderColor: string;
    iconColor: string;
    bgColor: string;
  }
> = {
  verification: {
    icon: ShieldCheck,
    label: 'verified',
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/5',
  },
  rejection: {
    icon: ShieldX,
    label: 'rejected',
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/5',
  },
  bulk_update: {
    icon: Layers,
    label: 'bulk updated',
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/5',
  },
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
  if (
    lower.endsWith('ch') ||
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('sh')
  ) {
    return word + 'es';
  }
  return word + 's';
}

interface EntityChipProps {
  entityType: AuditEntityType;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function EntityChip({ entityType, count, isActive, onClick }: EntityChipProps) {
  const meta = AuditEntityTypeEnumHelper.getMetadata(entityType);
  const label = pluralize(meta.text.toLowerCase(), count);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
        isActive
          ? 'bg-primary/15 text-primary border-primary/30 font-medium'
          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-primary' : 'bg-muted-foreground/50'
        )}
      />
      {count} {label}
    </span>
  );
}

export default function AuditBatchOperationEntry({
  batch,
}: {
  batch: BatchOperation;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [activeEntityType, setActiveEntityType] = useState<AuditEntityType | null>(
    null
  );

  const config = operationConfig[batch.type];
  const OperationIcon = config.icon;
  const username = batch.actionUser?.username;
  const initials = getUserInitials(username);

  // When expanding, auto-select first entity type if none selected
  const handleOpenChange = (open: boolean) => {
    setExpanded(open);
    if (open && activeEntityType === null && batch.entityBreakdown.length > 0) {
      setActiveEntityType(batch.entityBreakdown[0].entityType);
    }
  };

  const handleEntityChipClick = (entityType: AuditEntityType) => {
    if (!expanded) {
      setExpanded(true);
    }
    setActiveEntityType(entityType);
  };

  return (
    <Collapsible open={expanded} onOpenChange={handleOpenChange}>
      <div
        className={cn(
          'border-border overflow-hidden rounded-lg border border-l-4 transition-colors',
          config.borderColor,
          expanded ? config.bgColor : 'hover:bg-accent/30'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-start gap-3 p-3 text-left">
            {/* User Avatar */}
            {batch.actionUser?.osuId ? (
              <OsuAvatar
                osuId={batch.actionUser.osuId}
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
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {/* Primary line: User + action */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                {batch.actionUser ? (
                  <Link
                    href={`/players/${batch.actionUser.playerId}`}
                    className="text-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {username ?? `User ${batch.actionUser.id}`}
                  </Link>
                ) : (
                  <span className="text-muted-foreground italic">System</span>
                )}
                <span className="text-muted-foreground">{config.label}</span>
                <span className="text-foreground font-medium">
                  tournament + cascaded entities
                </span>
              </div>

              {/* Entity chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <OperationIcon
                  className={cn('h-3.5 w-3.5 shrink-0', config.iconColor)}
                />
                {batch.entityBreakdown.map((breakdown) => (
                  <EntityChip
                    key={breakdown.entityType}
                    entityType={breakdown.entityType}
                    count={breakdown.count}
                    isActive={expanded && activeEntityType === breakdown.entityType}
                    onClick={() => handleEntityChipClick(breakdown.entityType)}
                  />
                ))}
              </div>
            </div>

            {/* Timestamp and expand indicator */}
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <time
                className="text-muted-foreground text-xs"
                dateTime={batch.latestCreated}
              >
                {formatRelativeTime(batch.latestCreated)}
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
          <div className="border-border border-t">
            {batch.entityBreakdown.map((breakdown) => (
              <div
                key={breakdown.entityType}
                className={cn(
                  'border-border border-b last:border-b-0',
                  activeEntityType === breakdown.entityType
                    ? 'bg-background'
                    : 'bg-muted/20'
                )}
              >
                {/* Entity type header */}
                <button
                  type="button"
                  onClick={() => setActiveEntityType(
                    activeEntityType === breakdown.entityType
                      ? null
                      : breakdown.entityType
                  )}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                    'hover:bg-accent/30'
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'text-muted-foreground h-3.5 w-3.5 transition-transform',
                      activeEntityType === breakdown.entityType && 'rotate-90'
                    )}
                  />
                  <span className="font-medium">
                    {AuditEntityTypeEnumHelper.getMetadata(breakdown.entityType).text}
                  </span>
                  <span className="text-muted-foreground">
                    ({breakdown.count} {breakdown.count === 1 ? 'entry' : 'entries'})
                  </span>
                </button>

                {/* Nested groups */}
                {activeEntityType === breakdown.entityType && (
                  <div className="space-y-2 px-3 pb-3">
                    {breakdown.groups.map((group, i) => (
                      <AuditGroupedEntry
                        key={`${group.latestCreated}-${i}`}
                        group={group}
                        alwaysExpanded
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

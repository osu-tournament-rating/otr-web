'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';
import VerificationBadge from '@/components/badges/VerificationBadge';
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
    verificationStatus?: VerificationStatus;
    icon?: typeof Layers;
    iconColor?: string;
    label?: string;
    borderColor: string;
    bgColor: string;
  }
> = {
  submission: {
    icon: Layers,
    iconColor: 'text-green-500',
    label: 'created',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-500/5',
  },
  verification: {
    verificationStatus: VerificationStatus.Verified,
    borderColor: 'border-l-violet-400',
    bgColor: 'bg-violet-500/5',
  },
  rejection: {
    verificationStatus: VerificationStatus.Rejected,
    borderColor: 'border-l-violet-400',
    bgColor: 'bg-violet-500/5',
  },
  pre_verification: {
    verificationStatus: VerificationStatus.PreVerified,
    borderColor: 'border-l-violet-300',
    bgColor: 'bg-violet-400/5',
  },
  pre_rejection: {
    verificationStatus: VerificationStatus.PreRejected,
    borderColor: 'border-l-violet-300',
    bgColor: 'bg-violet-400/5',
  },
  bulk_update: {
    icon: Layers,
    iconColor: 'text-blue-500',
    label: 'bulk updated',
    borderColor: 'border-l-blue-500',
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
          ? 'bg-foreground/10 text-foreground border-foreground/20 font-medium'
          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-foreground' : 'bg-muted-foreground/50'
        )}
      />
      {count} {label}
    </span>
  );
}

/** Entity type hierarchy order (highest to lowest) */
const ENTITY_HIERARCHY: AuditEntityType[] = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
];

/** Display label for each entity type */
const ENTITY_LABEL: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournament',
  [AuditEntityType.Match]: 'match',
  [AuditEntityType.Game]: 'game',
  [AuditEntityType.Score]: 'score',
};

type ParentEntityInfo = {
  entityType: AuditEntityType;
  id: number;
  label: string;
  /** The URL to link to for this entity */
  href: string;
} | null;

/**
 * Extract a field value from an audit entry's changes.
 * Handles both created (newValue) and updated entries.
 */
function getFieldFromChanges(
  changes: Record<string, { originalValue?: unknown; newValue?: unknown }> | null,
  fieldName: string
): number | null {
  if (!changes) return null;
  const change = changes[fieldName];
  if (!change) return null;
  // For created entries, newValue has the initial value
  // For updated entries, originalValue has the current value
  const value = change.newValue ?? change.originalValue;
  return typeof value === 'number' ? value : null;
}

/**
 * Try to find the matchId for a game from its entries' changes.
 */
function findMatchIdForGame(batch: BatchOperation): number | null {
  const gameBreakdown = batch.entityBreakdown.find(
    (b) => b.entityType === AuditEntityType.Game
  );
  if (!gameBreakdown) return null;

  for (const group of gameBreakdown.groups) {
    const changes = group.sampleChanges as Record<
      string,
      { originalValue?: unknown; newValue?: unknown }
    > | null;
    const matchId = getFieldFromChanges(changes, 'matchId');
    if (matchId !== null) return matchId;
  }
  return null;
}

/**
 * Try to find the matchId for a score from its entries' changes.
 * Scores have gameId, so we need to find the game's matchId too.
 */
function findMatchIdForScore(batch: BatchOperation): number | null {
  // First try to get matchId from any game entries in the batch
  const matchIdFromGame = findMatchIdForGame(batch);
  if (matchIdFromGame !== null) return matchIdFromGame;

  // If no game entries, we can't determine the matchId client-side
  return null;
}

/**
 * Generate the href for an entity based on its type and available parent info.
 */
function generateEntityHref(
  entityType: AuditEntityType,
  entityId: number,
  batch: BatchOperation
): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return `/tournaments/${entityId}`;
    case AuditEntityType.Match:
      return `/matches/${entityId}`;
    case AuditEntityType.Game: {
      const matchId = findMatchIdForGame(batch);
      if (matchId !== null) {
        return `/matches/${matchId}?gameId=${entityId}`;
      }
      // Fallback to audit page if matchId not found
      return `/audit/games/${entityId}`;
    }
    case AuditEntityType.Score: {
      const matchId = findMatchIdForScore(batch);
      if (matchId !== null) {
        return `/matches/${matchId}?scoreId=${entityId}`;
      }
      // Fallback to audit page if matchId not found
      return `/audit/scores/${entityId}`;
    }
  }
}

/**
 * Find the parent entity in a batch operation.
 * Returns the highest-level entity in the hierarchy (Tournament > Match > Game > Score).
 */
function getParentEntity(batch: BatchOperation): ParentEntityInfo {
  for (const entityType of ENTITY_HIERARCHY) {
    const breakdown = batch.entityBreakdown.find(
      (b) => b.entityType === entityType
    );
    if (breakdown && breakdown.groups.length > 0) {
      const firstGroup = breakdown.groups[0];
      const entityId = firstGroup.sampleReferenceIdLock;
      return {
        entityType,
        id: entityId,
        label: ENTITY_LABEL[entityType],
        href: generateEntityHref(entityType, entityId, batch),
      };
    }
  }
  return null;
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
  const username = batch.actionUser?.username;
  const initials = getUserInitials(username);
  const parentEntity = getParentEntity(batch);

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
          expanded ? config.bgColor : 'hover:bg-muted/30'
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
                {config.verificationStatus !== undefined ? (
                  <VerificationBadge
                    verificationStatus={config.verificationStatus}
                    displayText
                    size="small"
                    minimal
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {/* Use "updated" instead of "bulk updated" for single entity changes */}
                    {batch.type === 'bulk_update' && batch.totalCount === 1
                      ? 'updated'
                      : config.label}
                  </span>
                )}
                {/* Show parent entity: "tournament #2978" or "tournament #2978 + child entities" */}
                {parentEntity && (
                  <>
                    <span className="text-foreground font-medium">
                      {parentEntity.label}
                    </span>
                    <Link
                      href={parentEntity.href}
                      className="text-muted-foreground hover:text-primary text-xs hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{parentEntity.id}
                    </Link>
                    {batch.entityBreakdown.length > 1 && (
                      <span className="text-foreground font-medium">
                        + child entities
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Entity chips */}
              <div className="flex flex-wrap items-center gap-1.5">
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

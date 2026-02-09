'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { AuditEvent, AuditEventAction } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AuditDiffDisplay from './AuditDiffDisplay';
import { getFieldLabel } from './auditFieldConfig';
import RelativeTime from './RelativeTime';

// --- Inline entity type helpers (avoid importing from server code) ---

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournament',
  [AuditEntityType.Match]: 'match',
  [AuditEntityType.Game]: 'game',
  [AuditEntityType.Score]: 'score',
};

const ENTITY_TYPE_PLURALS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournaments',
  [AuditEntityType.Match]: 'matches',
  [AuditEntityType.Game]: 'games',
  [AuditEntityType.Score]: 'scores',
};

function entityTypeToSlug(entityType: AuditEntityType): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return 'tournaments';
    case AuditEntityType.Match:
      return 'matches';
    case AuditEntityType.Game:
      return 'games';
    case AuditEntityType.Score:
      return 'scores';
  }
}

// --- Action display config ---

const ACTION_LABELS: Record<AuditEventAction, string> = {
  verification: 'verified',
  rejection: 'rejected',
  pre_verification: 'pre-verified',
  pre_rejection: 'pre-rejected',
  submission: 'submitted',
  update: 'updated',
  deletion: 'deleted',
};

const ACTION_TEXT_COLORS: Record<AuditEventAction, string> = {
  verification: 'text-green-600 dark:text-green-400',
  pre_verification: 'text-green-600 dark:text-green-400',
  rejection: 'text-red-600 dark:text-red-400',
  pre_rejection: 'text-red-600 dark:text-red-400',
  submission: 'text-blue-600 dark:text-blue-400',
  update: 'text-blue-600 dark:text-blue-400',
  deletion: 'text-red-600 dark:text-red-400',
};

const ACTION_BORDER_COLORS: Record<AuditEventAction, string> = {
  verification: 'border-l-green-500',
  pre_verification: 'border-l-green-500',
  rejection: 'border-l-red-500',
  pre_rejection: 'border-l-red-500',
  submission: 'border-l-blue-500',
  update: 'border-l-blue-500',
  deletion: 'border-l-red-500',
};

type AuditEventCardProps = {
  event: AuditEvent;
};

function buildDescription(event: AuditEvent): React.ReactNode {
  const { action, topEntity, childLevel, isCascade, parentTournament, changedFields } = event;
  const actionLabel = ACTION_LABELS[action];
  const entityLabel = ENTITY_TYPE_LABELS[topEntity.entityType];
  const topEntitySlug = entityTypeToSlug(topEntity.entityType);
  const entityName = topEntity.entityName ?? `#${topEntity.entityId}`;

  const entityLink = (
    <Link
      href={`/audit/${topEntitySlug}/${topEntity.entityId}`}
      className="text-primary font-medium hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {entityName}
    </Link>
  );

  // Cascade: "rejected Tournament X (118 matches)" or "(85 of 118 matches)"
  if (isCascade && childLevel) {
    const childPlural = ENTITY_TYPE_PLURALS[childLevel.entityType];
    const countDisplay = childLevel.totalCount
      ? `${childLevel.affectedCount} of ${childLevel.totalCount} ${childPlural}`
      : `${childLevel.affectedCount} ${childPlural}`;

    // Non-tournament top entity: "rejected Match #123 in Tournament Y (15 games)"
    if (topEntity.entityType !== AuditEntityType.Tournament && parentTournament) {
      const tournamentLink = (
        <Link
          href={`/audit/tournaments/${parentTournament.id}`}
          className="text-primary font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {parentTournament.name ?? `Tournament #${parentTournament.id}`}
        </Link>
      );

      return (
        <>
          <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>
          {' '}{entityLabel} {entityLink} in {tournamentLink}
          {' '}
          <span className="text-muted-foreground">({countDisplay})</span>
        </>
      );
    }

    return (
      <>
        <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>
        {' '}{entityLabel} {entityLink}
        {' '}
        <span className="text-muted-foreground">({countDisplay})</span>
      </>
    );
  }

  // Grouped non-cascade (topEntity.count > 1): "updated 4 games in Tournament Y (field1, field2)"
  if (topEntity.count > 1) {
    const entityPlural = ENTITY_TYPE_PLURALS[topEntity.entityType];
    const fieldLabels = changedFields.map((f) =>
      getFieldLabel(topEntity.entityType, f)
    );

    const parentContext = parentTournament ? (
      <>
        {' in '}
        <Link
          href={`/audit/tournaments/${parentTournament.id}`}
          className="text-primary font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {parentTournament.name ?? `Tournament #${parentTournament.id}`}
        </Link>
      </>
    ) : null;

    return (
      <>
        <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>
        {' '}{topEntity.count} {entityPlural}
        {parentContext}
        {fieldLabels.length > 0 && (
          <span className="text-muted-foreground">
            {' '}({fieldLabels.join(', ')})
          </span>
        )}
      </>
    );
  }

  // Single update: "updated Tournament X (field1)"
  const fieldLabels = changedFields.map((f) =>
    getFieldLabel(topEntity.entityType, f)
  );

  const parentContext =
    topEntity.entityType !== AuditEntityType.Tournament && parentTournament ? (
      <>
        {' in '}
        <Link
          href={`/audit/tournaments/${parentTournament.id}`}
          className="text-primary font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {parentTournament.name ?? `Tournament #${parentTournament.id}`}
        </Link>
      </>
    ) : null;

  return (
    <>
      <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>
      {' '}{entityLabel} {entityLink}
      {parentContext}
      {fieldLabels.length > 0 && (
        <span className="text-muted-foreground">
          {' '}({fieldLabels.join(', ')})
        </span>
      )}
    </>
  );
}

export default function AuditEventCard({ event }: AuditEventCardProps): React.JSX.Element {
  const changes = event.sampleChanges as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  > | null;
  const changeCount = changes ? Object.keys(changes).length : 0;
  const hasExpandableContent = changeCount > 0;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={hasExpandableContent ? setIsOpen : undefined}>
      <div
        className={cn(
          'border-border border-b border-l-2 transition-colors',
          ACTION_BORDER_COLORS[event.action],
          event.isSystem && 'border-l-amber-400',
          isOpen ? 'bg-muted/30' : 'hover:bg-accent/50'
        )}
      >
        <CollapsibleTrigger asChild disabled={!hasExpandableContent}>
          <button
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm',
              !hasExpandableContent && 'cursor-default'
            )}
          >
            {/* User avatar */}
            {event.actionUser?.osuId ? (
              <OsuAvatar
                osuId={event.actionUser.osuId}
                username={event.actionUser.username}
                size={28}
                className="shrink-0"
              />
            ) : (
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[11px]">
                  {event.isSystem ? 'S' : '?'}
                </AvatarFallback>
              </Avatar>
            )}

            {/* User name + description */}
            <span className="min-w-0 flex-1">
              {event.isSystem ? (
                <span className="text-muted-foreground mr-1 italic">System</span>
              ) : event.actionUser ? (
                <Link
                  href={`/players/${event.actionUser.playerId}`}
                  className="text-primary mr-1 font-medium hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {event.actionUser.username ?? `User ${event.actionUser.id}`}
                </Link>
              ) : (
                <span className="text-muted-foreground mr-1 italic">Unknown</span>
              )}
              {buildDescription(event)}
            </span>

            {/* Expand indicator */}
            {hasExpandableContent && (
              <ChevronRight
                className={cn(
                  'text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform',
                  isOpen && 'rotate-90'
                )}
              />
            )}

            {/* Timestamp */}
            <RelativeTime
              dateString={event.created}
              className="text-muted-foreground shrink-0 text-xs"
            />
          </button>
        </CollapsibleTrigger>

        {/* Expanded diffs */}
        <CollapsibleContent>
          {changes && changeCount > 0 && (
            <div className="bg-muted/20 border-border border-t px-3 py-2">
              <div className="flex flex-col gap-1 pl-9">
                {Object.entries(changes).map(([fieldName, change]) => (
                  <AuditDiffDisplay
                    key={fieldName}
                    fieldName={fieldName}
                    change={change}
                    entityType={event.topEntity.entityType}
                    referencedUsers={event.referencedUsers}
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

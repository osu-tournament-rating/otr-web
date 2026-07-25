'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { ChevronRight, Loader2 } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type {
  AuditEntry,
  AuditEvent,
  AuditEventAction,
} from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import { orpc } from '@/lib/orpc/orpc';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AuditDiffDisplay from './AuditDiffDisplay';
import {
  entityTypeToSlug,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
} from '@/lib/audit-entity-types';
import { getFieldLabel } from './auditFieldConfig';
import RelativeTime from './RelativeTime';

// --- Actions where inline field labels are suppressed ---
// Self-describing (verification/rejection) + submission (created) + deletion

const FIELD_SUPPRESSED_ACTIONS = new Set<AuditEventAction>([
  'verification',
  'rejection',
  'pre_verification',
  'pre_rejection',
  'submission',
  'deletion',
]);

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

type EventDetailsResponse = {
  entries: AuditEntry[];
  nextCursor: number | null;
  hasMore: boolean;
};

function buildDescription(event: AuditEvent): React.ReactNode {
  const {
    action,
    topEntity,
    childLevel,
    isCascade,
    parentTournament,
    changedFields,
  } = event;
  const actionLabel = ACTION_LABELS[action];
  const entityLabel = ENTITY_TYPE_LABELS[topEntity.entityType];
  const topEntitySlug = entityTypeToSlug(topEntity.entityType);
  const entityName = topEntity.entityName ?? `#${topEntity.entityId}`;

  const entityLink = (
    <Link
      href={`/audit/${topEntitySlug}/${topEntity.entityId}`}
      className="font-medium text-primary hover:underline"
    >
      {entityName}
    </Link>
  );

  // Cascade: "rejected Tournament X (118 matches)" or "(85 of 118 matches)"
  if (isCascade && childLevel) {
    const childPlural = ENTITY_TYPE_PLURALS[childLevel.entityType];
    const countDisplay =
      childLevel.totalCount && childLevel.affectedCount < childLevel.totalCount
        ? `${childLevel.affectedCount} of ${childLevel.totalCount} ${childPlural}`
        : null;

    // Non-tournament top entity: "rejected Match #123 in Tournament Y (15 games)"
    if (
      topEntity.entityType !== AuditEntityType.Tournament &&
      parentTournament
    ) {
      const tournamentLink = (
        <Link
          href={`/audit/tournaments/${parentTournament.id}`}
          className="font-medium text-primary hover:underline"
        >
          {parentTournament.name ?? `Tournament #${parentTournament.id}`}
        </Link>
      );

      return (
        <>
          <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>{' '}
          {entityLabel} {entityLink} in {tournamentLink}
          {countDisplay && (
            <span className="text-muted-foreground"> ({countDisplay})</span>
          )}
        </>
      );
    }

    return (
      <>
        <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>{' '}
        {entityLabel} {entityLink}
        {countDisplay && (
          <span className="text-muted-foreground"> ({countDisplay})</span>
        )}
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
          className="font-medium text-primary hover:underline"
        >
          {parentTournament.name ?? `Tournament #${parentTournament.id}`}
        </Link>
      </>
    ) : null;

    return (
      <>
        <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>{' '}
        {topEntity.count} {entityPlural}
        {parentContext}
        {!FIELD_SUPPRESSED_ACTIONS.has(action) && fieldLabels.length > 0 && (
          <span className="text-muted-foreground">
            {fieldLabels.length > 3
              ? ` (${fieldLabels.length} fields)`
              : ` (${fieldLabels.join(', ')})`}
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
          className="font-medium text-primary hover:underline"
        >
          {parentTournament.name ?? `Tournament #${parentTournament.id}`}
        </Link>
      </>
    ) : null;

  return (
    <>
      <span className={ACTION_TEXT_COLORS[action]}>{actionLabel}</span>{' '}
      {entityLabel} {entityLink}
      {parentContext}
      {!FIELD_SUPPRESSED_ACTIONS.has(action) && fieldLabels.length > 0 && (
        <span className="text-muted-foreground">
          {fieldLabels.length > 3
            ? ` (${fieldLabels.length} fields)`
            : ` (${fieldLabels.join(', ')})`}
        </span>
      )}
    </>
  );
}

function EventEntityEntries({
  event,
  entityType,
}: {
  event: AuditEvent;
  entityType: AuditEntityType;
}) {
  const getKey = (
    _pageIndex: number,
    previousPageData: EventDetailsResponse | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) return null;

    return [
      'audit-event-entities',
      event.eventKey,
      event.eventId,
      event.actionUserId,
      event.created,
      entityType,
      previousPageData?.nextCursor ?? null,
    ] as const;
  };

  const { data, size, setSize, isLoading, isValidating, error, mutate } =
    useSWRInfinite(
      getKey,
      async ([, , , , , , cursor]) =>
        orpc.audit.eventDetails({
          eventKey: event.eventKey,
          eventId: event.eventId ?? undefined,
          actionUserId: event.actionUserId,
          created: event.created,
          entityType,
          cursor: cursor ?? undefined,
          limit: 50,
        }),
      {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 60_000,
      }
    );
  const pages = data ?? [];
  const entries = pages.flatMap((page) => page.entries);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;

  const entitySlug = entityTypeToSlug(entityType);
  const entityPlural = ENTITY_TYPE_PLURALS[entityType];
  const entityLabel = ENTITY_TYPE_LABELS[entityType];
  const isRepeatedTopEntity =
    entityType === event.topEntity.entityType &&
    event.topEntity.count === 1 &&
    event.topEntity.entryCount > 1;

  return (
    <div className="border-t border-border bg-muted/20 px-3 py-2">
      <div className="flex flex-col gap-2 pl-9">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {isRepeatedTopEntity
            ? 'Changes in this event'
            : `Affected ${entityPlural}`}
        </span>

        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <span>Unable to load audit entries.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void mutate()}
              disabled={isValidating}
            >
              Retry
            </Button>
          </div>
        )}

        {entries.map((entry) => {
          const changes = entry.changes as Record<
            string,
            { originalValue: unknown; newValue: unknown }
          > | null;
          const entryLabel =
            entry.entityName ??
            `${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} #${entry.referenceId ?? entry.referenceIdLock}`;
          const entryId = entry.referenceId ?? entry.referenceIdLock;

          return (
            <div key={entry.id} className="flex flex-col gap-1">
              <Link
                href={`/audit/${entitySlug}/${entryId}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {entryLabel}
              </Link>
              {changes && Object.keys(changes).length > 0 ? (
                <div className="flex flex-col gap-1 pl-3">
                  {Object.entries(changes).map(([fieldName, change]) => (
                    <AuditDiffDisplay
                      key={fieldName}
                      fieldName={fieldName}
                      change={change}
                      entityType={entityType}
                      referencedUsers={entry.referencedUsers}
                    />
                  ))}
                </div>
              ) : (
                <span className="pl-3 text-xs text-muted-foreground italic">
                  {event.action === 'deletion'
                    ? '(deleted)'
                    : '(no field changes)'}
                </span>
              )}
            </div>
          );
        })}

        {hasMore && !error && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            {isValidating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Load more
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AuditEventCard({
  event,
}: AuditEventCardProps): React.JSX.Element {
  const changes = event.sampleChanges as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  > | null;
  const changeCount = changes ? Object.keys(changes).length : 0;
  const hasExpandableContent =
    changeCount > 0 || event.isCascade || event.topEntity.entryCount > 1;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      data-testid="audit-event-card"
      open={isOpen}
      onOpenChange={hasExpandableContent ? setIsOpen : undefined}
    >
      <div
        className={cn(
          'border-b border-l-2 border-border transition-colors',
          ACTION_BORDER_COLORS[event.action],
          event.isSystem && 'border-l-amber-400',
          isOpen ? 'bg-muted/30' : 'hover:bg-accent/50'
        )}
      >
        <div className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm">
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
          <span data-testid="event-card-description" className="min-w-0 flex-1">
            {event.isSystem ? (
              <span className="mr-1 text-muted-foreground italic">System</span>
            ) : event.actionUser ? (
              event.actionUser.playerId ? (
                <Link
                  href={`/players/${event.actionUser.playerId}`}
                  className="mr-1 font-medium text-primary hover:underline"
                >
                  {event.actionUser.username ?? `User ${event.actionUser.id}`}
                </Link>
              ) : (
                <span className="mr-1 font-medium text-foreground">
                  {event.actionUser.username ?? `User ${event.actionUser.id}`}
                </span>
              )
            ) : (
              <span className="mr-1 text-muted-foreground italic">Unknown</span>
            )}
            {buildDescription(event)}
          </span>

          {/* Expand toggle */}
          {hasExpandableContent && (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                className="-mr-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/70"
              >
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
              </button>
            </CollapsibleTrigger>
          )}

          {/* Timestamp */}
          <RelativeTime
            data-testid="event-card-timestamp"
            dateString={event.created}
            className="shrink-0 text-xs text-muted-foreground"
          />
        </div>

        {/* Expanded diffs */}
        <CollapsibleContent data-testid="event-card-diff">
          {changes && changeCount > 0 && event.topEntity.entryCount === 1 && (
            <div className="border-t border-border bg-muted/20 px-3 py-2">
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
          {event.topEntity.entryCount > 1 && isOpen && (
            <EventEntityEntries
              event={event}
              entityType={event.topEntity.entityType}
            />
          )}
          {event.isCascade && event.childLevel && isOpen && (
            <EventEntityEntries
              event={event}
              entityType={event.childLevel.entityType}
            />
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

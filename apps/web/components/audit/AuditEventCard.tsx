'use client';

import { useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import type {
  AuditEntry,
  AuditEvent,
  AuditEventAction,
} from '@/lib/orpc/schema/audit';
import { orpc } from '@/lib/orpc/orpc';
import SectionError from '@/components/error/SectionError';
import { Button } from '@/components/kit/controls/Button';
import { RowListSkeleton } from '@/components/kit/feedback/Skeletons';
import { RelativeTime } from '@/components/kit/format/RelativeTime';
import { Eyebrow } from '@/components/kit/layout/Typography';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  childCountTail,
  entityTypeToSlug,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
} from '@/lib/audit-entity-types';
import { ACTION_LABELS } from '@/lib/audit-actions';
import { getAuditFieldLabel } from '@/lib/kit/format/audit';
import { formatCount, formatId } from '@/lib/kit/format/number';
import { formatActionBreakdown } from './ActionBreakdownPhrase';
import {
  AuditActor,
  AuditChanges,
  AuditInlineLink,
  AuditRowDetails,
  AuditRowLine,
  AuditRowToggle,
  readChanges,
} from './AuditRow';
import { getEntityTypeName, nameOr } from './auditParams';

const FIELD_SUPPRESSED_ACTIONS = new Set<AuditEventAction>([
  'verification',
  'rejection',
  'pre_verification',
  'pre_rejection',
  'submission',
  'deletion',
]);

type AuditEventCardProps = {
  event: AuditEvent;
};

type EventDetailsResponse = {
  entries: AuditEntry[];
  nextCursor: number | null;
  hasMore: boolean;
};

/** " (Name, Abbreviation)", or " (5 fields)" past three. */
function fieldsTail(
  entityType: AuditEntityType,
  changedFields: readonly string[]
): string {
  if (changedFields.length === 0) return '';
  if (changedFields.length > 3) {
    return ` (${formatCount(changedFields.length)} fields)`;
  }
  const labels = changedFields.map((field) =>
    getAuditFieldLabel(entityType, field)
  );
  return ` (${labels.join(', ')})`;
}

function TournamentLink({
  tournament,
}: {
  tournament: NonNullable<AuditEvent['parentTournament']>;
}) {
  return (
    <AuditInlineLink inSentence href={`/audit/tournaments/${tournament.id}`}>
      {nameOr(tournament.name, `Tournament #${formatId(tournament.id)}`)}
    </AuditInlineLink>
  );
}

/** What happened, after the actor: "verified tournament Corsace Open 2025 (…)". */
function EventDescription({ event }: { event: AuditEvent }) {
  const {
    action,
    actionBreakdown,
    topEntity,
    childLevel,
    isCascade,
    parentTournament,
    changedFields,
  } = event;
  const verb = actionBreakdown
    ? formatActionBreakdown(actionBreakdown)
    : ACTION_LABELS[action];
  const entityLabel = ENTITY_TYPE_LABELS[topEntity.entityType];
  const entityPlural = ENTITY_TYPE_PLURALS[topEntity.entityType];
  const entityLink = (
    <AuditInlineLink
      inSentence
      href={`/audit/${entityTypeToSlug(topEntity.entityType)}/${topEntity.entityId}`}
    >
      {nameOr(topEntity.entityName, `#${formatId(topEntity.entityId)}`)}
    </AuditInlineLink>
  );
  const inTournament =
    topEntity.entityType !== AuditEntityType.Tournament && parentTournament ? (
      <>
        {' in '}
        <TournamentLink tournament={parentTournament} />
      </>
    ) : null;

  // Cascade: "(85 of 118 matches)", or "(verified 115, rejected 3 of 118 matches)"
  if (isCascade && childLevel) {
    // A live child count can sit below a historical affected count once children are deleted.
    const showsChildTotal =
      childLevel.totalCount !== null &&
      childLevel.totalCount > childLevel.affectedCount;
    const childTail = childCountTail(
      childLevel.entityType,
      childLevel.affectedCount,
      childLevel.totalCount
    );
    const countDisplay = childLevel.actionBreakdown
      ? `${formatActionBreakdown(childLevel.actionBreakdown)} ${childTail}`
      : showsChildTotal
        ? `${formatCount(childLevel.affectedCount)} ${childTail}`
        : null;
    const topDisplay =
      topEntity.count > 1 ? (
        actionBreakdown ? (
          entityPlural
        ) : (
          `${formatCount(topEntity.count)} ${entityPlural}`
        )
      ) : (
        <>
          {entityLabel} {entityLink}
        </>
      );

    return (
      <>
        {verb} {topDisplay}
        {inTournament}
        {countDisplay ? (
          <span className="text-muted-foreground"> ({countDisplay})</span>
        ) : null}
      </>
    );
  }

  const tail = !FIELD_SUPPRESSED_ACTIONS.has(action)
    ? fieldsTail(topEntity.entityType, changedFields)
    : '';

  // Grouped (topEntity.count > 1): "updated 4 games in Tournament Y (Mods)"
  if (topEntity.count > 1) {
    return (
      <>
        {verb}{' '}
        {actionBreakdown
          ? entityPlural
          : `${formatCount(topEntity.count)} ${entityPlural}`}
        {parentTournament ? (
          <>
            {' in '}
            <TournamentLink tournament={parentTournament} />
          </>
        ) : null}
        {tail && !actionBreakdown ? (
          <span className="text-muted-foreground">{tail}</span>
        ) : null}
      </>
    );
  }

  // Single: "updated tournament X (Name)"
  return (
    <>
      {ACTION_LABELS[action]} {entityLabel} {entityLink}
      {inTournament}
      {tail ? <span className="text-muted-foreground">{tail}</span> : null}
    </>
  );
}

/** The entities an event changed, fetched when the row opens. */
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
  const isRepeatedTopEntity =
    entityType === event.topEntity.entityType &&
    event.topEntity.count === 1 &&
    event.topEntity.entryCount > 1;

  return (
    <section className="flex flex-col gap-3">
      <Eyebrow className="block">
        {isRepeatedTopEntity
          ? 'Changes in this event'
          : `Affected ${ENTITY_TYPE_PLURALS[entityType]}`}
      </Eyebrow>

      {isLoading ? (
        <RowListSkeleton rows={2} leading="none" trailing={false} />
      ) : null}

      {entries.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const deleted = entry.actionType === AuditActionType.Deleted;
            const changes = deleted ? null : readChanges(entry.changes);
            const entryId = entry.referenceId ?? entry.referenceIdLock;

            return (
              <li key={entry.id} className="flex flex-col gap-1.5">
                <AuditInlineLink
                  href={`/audit/${entitySlug}/${entryId}`}
                  className="w-fit text-sm font-medium"
                >
                  {nameOr(
                    entry.entityName,
                    `${getEntityTypeName(entityType)} #${formatId(entryId)}`
                  )}
                </AuditInlineLink>
                {changes && Object.keys(changes).length > 0 ? (
                  <AuditChanges
                    entityType={entityType}
                    changes={changes}
                    users={entry.referencedUsers}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {deleted ? 'Deleted' : 'No field changes'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Under the entries, so a failed later batch keeps the ones above. */}
      {error ? (
        <SectionError
          size="inline"
          title={
            entries.length > 0
              ? 'More audit entries could not load'
              : 'Audit entries could not load'
          }
          retrying={isValidating}
          onRetry={() => void mutate()}
        />
      ) : null}

      {hasMore && !error ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 self-start"
          pending={isValidating}
          onClick={() => setSize(size + 1)}
        >
          Load more
        </Button>
      ) : null}
    </section>
  );
}

/**
 * One event in the audit log: who did what to which entity, with its one
 * status icon, the time, and the changes behind a button. Neutral, like
 * every other row; only real links are links.
 */
export default function AuditEventCard({
  event,
}: AuditEventCardProps): React.JSX.Element {
  // A deletion's changes only restate the removed row.
  const changes =
    event.action === 'deletion' ? null : readChanges(event.sampleChanges);
  const changeCount = changes ? Object.keys(changes).length : 0;
  const hasExpandableContent =
    changeCount > 0 || event.isCascade || event.topEntity.entryCount > 1;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={hasExpandableContent ? setIsOpen : undefined}
    >
      <li data-testid="audit-event-card" className="px-4 py-3">
        <AuditRowLine
          action={event.action}
          sentenceTestId="event-card-description"
          sentence={
            <>
              <AuditActor
                user={event.actionUser}
                fallback={event.isSystem ? 'System' : 'Unknown'}
              />{' '}
              <EventDescription event={event} />
            </>
          }
          meta={
            <span data-testid="event-card-timestamp">
              <RelativeTime date={event.created} />
            </span>
          }
          toggle={
            hasExpandableContent ? (
              <CollapsibleTrigger asChild>
                <AuditRowToggle
                  open={isOpen}
                  data-testid="audit-event-toggle"
                />
              </CollapsibleTrigger>
            ) : undefined
          }
        />

        {hasExpandableContent ? (
          <CollapsibleContent data-testid="event-card-diff">
            <AuditRowDetails>
              {changes &&
              changeCount > 0 &&
              event.topEntity.entryCount === 1 ? (
                <AuditChanges
                  entityType={event.topEntity.entityType}
                  changes={changes}
                  users={event.referencedUsers}
                />
              ) : null}
              {event.topEntity.entryCount > 1 && isOpen ? (
                <EventEntityEntries
                  event={event}
                  entityType={event.topEntity.entityType}
                />
              ) : null}
              {event.isCascade && event.childLevel && isOpen ? (
                <EventEntityEntries
                  event={event}
                  entityType={event.childLevel.entityType}
                />
              ) : null}
            </AuditRowDetails>
          </CollapsibleContent>
        ) : null}
      </li>
    </Collapsible>
  );
}

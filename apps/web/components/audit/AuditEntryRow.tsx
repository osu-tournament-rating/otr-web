'use client';

import { useState } from 'react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import type {
  AuditEntry,
  CascadeContext,
  UnauditedSubmission,
} from '@/lib/orpc/schema/audit';
import { ACTION_LABELS, classifyAction } from '@/lib/audit-actions';
import { RelativeTime } from '@/components/kit/format/RelativeTime';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCountOf } from '@/lib/kit/format/number';
import {
  AuditActor,
  AuditChanges,
  AuditRowDetails,
  AuditRowLine,
  AuditRowToggle,
  readChanges,
} from './AuditRow';
import CascadeContextBanner from './CascadeContextBanner';

/** A submission the audit log never recorded, read from the tournament itself. */
export function AuditSubmissionRow({
  submission,
}: {
  submission: UnauditedSubmission;
}): React.JSX.Element {
  return (
    <li data-testid="timeline-submission" className="px-4 py-3">
      <AuditRowLine
        action="submission"
        sentence={
          <>
            <AuditActor user={submission.submittedBy} fallback="Unknown" />{' '}
            {ACTION_LABELS.submission}
          </>
        }
        meta={<RelativeTime date={submission.created} />}
      />
      <p className="mt-1 pl-7 text-xs text-muted-foreground">
        From the tournament record. Submissions were not audited at the time.
      </p>
    </li>
  );
}

type AuditEntryRowProps = {
  entry: AuditEntry;
  cascadeContext?: CascadeContext | null;
  /** The entity whose page this row is rendered on, so a cascade it started reads as impact. */
  viewedEntity?: { entityType: AuditEntityType; entityId: number };
  /** Identifies the changed entity when the row is not on that entity's own page. */
  heading?: React.ReactNode;
};

/**
 * One entry in an entity's audit history: who did what, the time, and the
 * changed fields, which open in place. Verification changes carry the one
 * status icon; everything else reads as plain words.
 */
export default function AuditEntryRow({
  entry,
  cascadeContext,
  viewedEntity,
  heading,
}: AuditEntryRowProps): React.JSX.Element {
  // A deletion's changes only restate the removed row.
  const changes =
    entry.actionType === AuditActionType.Deleted
      ? null
      : readChanges(entry.changes);
  const changeCount = changes ? Object.keys(changes).length : 0;
  const action = classifyAction(entry.actionType, entry.changes);
  // The status icon already says what a verification changed.
  const [isOpen, setIsOpen] = useState(
    action !== 'verification' && changeCount > 0 && changeCount < 10
  );

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={changeCount > 0 ? setIsOpen : undefined}
    >
      <li
        data-testid="timeline-entry"
        id={`audit-${entry.id}`}
        className="scroll-mt-24 px-4 py-3 transition-colors"
      >
        {heading ? <div className="mb-1.5 pl-7">{heading}</div> : null}

        <AuditRowLine
          action={action}
          sentence={
            <>
              <AuditActor user={entry.actionUser} fallback="System" />{' '}
              <span data-testid="timeline-action-badge">
                {ACTION_LABELS[action]}
              </span>
            </>
          }
          meta={
            <>
              {changeCount > 0 ? (
                <span>{formatCountOf(changeCount, 'field')} changed</span>
              ) : null}
              <RelativeTime date={entry.created} />
            </>
          }
          toggle={
            changeCount > 0 ? (
              <CollapsibleTrigger asChild>
                <AuditRowToggle
                  open={isOpen}
                  data-testid="timeline-entry-toggle"
                />
              </CollapsibleTrigger>
            ) : undefined
          }
        />

        {cascadeContext ? (
          <div className="mt-2 pl-7">
            <CascadeContextBanner
              context={cascadeContext}
              viewedEntity={viewedEntity}
            />
          </div>
        ) : null}

        {changes && changeCount > 0 ? (
          <CollapsibleContent data-testid="timeline-entry-diff">
            <AuditRowDetails>
              <AuditChanges
                entityType={entry.entityType}
                changes={changes}
                users={entry.referencedUsers}
              />
            </AuditRowDetails>
          </CollapsibleContent>
        ) : null}
      </li>
    </Collapsible>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import type {
  AuditActionUser,
  AuditEntry,
  AuditEventAction,
  CascadeContext,
  UnauditedSubmission,
} from '@/lib/orpc/schema/audit';
import {
  ACTION_LABELS,
  ACTION_TEXT_COLORS,
  classifyAction,
} from '@/lib/audit-actions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AuditDiffDisplay from './AuditDiffDisplay';
import CascadeContextBanner from './CascadeContextBanner';
import RelativeTime from './RelativeTime';

const ACTION_ICONS: Record<AuditActionType, typeof PlusCircle> = {
  [AuditActionType.Created]: PlusCircle,
  [AuditActionType.Updated]: Pencil,
  [AuditActionType.Deleted]: Trash2,
};

const ACTION_BADGE_COLORS: Record<AuditEventAction, string> = {
  verification: 'bg-success/5 border-success/15',
  pre_verification: 'bg-success/5 border-success/15',
  rejection: 'bg-destructive/5 border-destructive/15',
  pre_rejection: 'bg-warning/5 border-warning/15',
  submission: 'bg-green-500/5 border-green-500/15',
  update: 'bg-blue-500/5 border-blue-500/15',
  deletion: 'bg-destructive/5 border-destructive/15',
};

function ActionUserLabel({
  user,
  fallback,
}: {
  user: AuditActionUser | null;
  fallback: string;
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      {user ? (
        <>
          {user.osuId ? (
            <OsuAvatar osuId={user.osuId} username={user.username} size={20} />
          ) : (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">
                {user.username?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          )}
          {user.playerId ? (
            <Link
              href={`/players/${user.playerId}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {user.username ?? `User ${user.id}`}
            </Link>
          ) : (
            <span className="text-foreground">
              {user.username ?? `User ${user.id}`}
            </span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground italic">{fallback}</span>
      )}
    </span>
  );
}

/** A submission the audit log never recorded, read from the tournament itself. */
export function AuditSubmissionRow({
  submission,
}: {
  submission: UnauditedSubmission;
}): React.JSX.Element {
  return (
    <div data-testid="timeline-submission" className="border-b border-border">
      <div className="flex items-center gap-3 px-3 pt-2.5 pb-1">
        <PlusCircle
          className={cn('h-4 w-4 shrink-0', ACTION_TEXT_COLORS.submission)}
        />

        <Badge
          variant="outline"
          className={cn(
            'shrink-0 text-xs',
            ACTION_TEXT_COLORS.submission,
            ACTION_BADGE_COLORS.submission
          )}
        >
          Submitted
        </Badge>

        <ActionUserLabel user={submission.submittedBy} fallback="Unknown" />

        <span className="flex-1" />

        <RelativeTime
          dateString={submission.created}
          className="shrink-0 text-xs text-muted-foreground"
        />
      </div>

      <p className="pr-3 pb-2.5 pl-10 text-xs text-muted-foreground">
        From the tournament record. Submissions were not audited at the time.
      </p>
    </div>
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
      : (entry.changes as Record<
          string,
          { originalValue: unknown; newValue: unknown }
        > | null);
  const changeCount = changes ? Object.keys(changes).length : 0;
  const action = classifyAction(entry.actionType, entry.changes);
  // The verified badge already says what changed.
  const [isOpen, setIsOpen] = useState(
    action !== 'verification' && changeCount > 0 && changeCount < 10
  );

  const actionLabel = ACTION_LABELS[action];
  const ActionIcon = ACTION_ICONS[entry.actionType];

  return (
    <Collapsible
      data-testid="timeline-entry"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div
        id={`audit-${entry.id}`}
        className={cn(
          'group border-b border-border transition-colors',
          isOpen ? 'bg-muted/30' : 'hover:bg-accent/50'
        )}
      >
        {heading && <div className="px-3 pt-2">{heading}</div>}

        {cascadeContext && (
          <div className="px-3 pt-2">
            <CascadeContextBanner
              context={cascadeContext}
              viewedEntity={viewedEntity}
            />
          </div>
        )}

        <CollapsibleTrigger asChild disabled={changeCount === 0}>
          <button
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left',
              changeCount === 0 && 'cursor-default'
            )}
          >
            <ActionIcon
              className={cn('h-4 w-4 shrink-0', ACTION_TEXT_COLORS[action])}
            />

            <Badge
              data-testid="timeline-action-badge"
              variant="outline"
              className={cn(
                'shrink-0 text-xs',
                ACTION_TEXT_COLORS[action],
                ACTION_BADGE_COLORS[action]
              )}
            >
              {actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)}
            </Badge>

            <ActionUserLabel user={entry.actionUser} fallback="System" />

            <span className="flex-1" />

            {changeCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
                {changeCount} field{changeCount !== 1 ? 's' : ''} changed
              </span>
            )}

            <RelativeTime
              dateString={entry.created}
              className="shrink-0 text-xs text-muted-foreground"
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent data-testid="timeline-entry-diff">
          {changes && changeCount > 0 && (
            <div className="border-t border-border bg-muted/20 px-3 py-2">
              <div className="flex flex-col gap-1 pl-7">
                {Object.entries(changes).map(([fieldName, change]) => (
                  <AuditDiffDisplay
                    key={fieldName}
                    fieldName={fieldName}
                    change={change}
                    entityType={entry.entityType}
                    referencedUsers={entry.referencedUsers}
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

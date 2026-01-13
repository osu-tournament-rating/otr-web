'use client';

import { formatDistanceToNow } from 'date-fns';

import { AuditActionType, ReportEntityType } from '@otr/core/osu';

import { Card } from '@/components/ui/card';

import AuditActorBadge from './AuditActorBadge';
import AuditActionBadge from './AuditActionBadge';
import AuditChangesDisplay from './AuditChangesDisplay';
import AuditEntityLink from './AuditEntityLink';

const ACTION_VERBS = {
  [AuditActionType.Insert]: 'created',
  [AuditActionType.Update]: 'updated',
  [AuditActionType.Delete]: 'deleted',
} as const;

type ChangeValue = {
  originalValue: unknown;
  newValue: unknown;
};

type AuditRecord = {
  id: number;
  entityType: ReportEntityType;
  created: string;
  referenceIdLock: number;
  referenceId: number | null;
  actionUserId: number | null;
  actionType: AuditActionType;
  changes: Record<string, ChangeValue> | null;
  actor: {
    id: number;
    player: {
      id: number;
      osuId: number;
      username: string;
      country: string;
    } | null;
  } | null;
  entityDisplayName: string;
};

export default function AuditListItem({ audit }: { audit: AuditRecord }) {
  const actionVerb = ACTION_VERBS[audit.actionType];

  return (
    <Card className="p-4 transition-colors hover:bg-accent/30">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <AuditActorBadge actor={audit.actor} />
            <span className="text-muted-foreground">{actionVerb}</span>
            <AuditEntityLink
              auditId={audit.id}
              entityType={audit.entityType}
              entityDisplayName={audit.entityDisplayName}
            />
          </div>

          {audit.actionType === AuditActionType.Update && audit.changes && (
            <AuditChangesDisplay changes={audit.changes} maxItems={3} />
          )}

          <p className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(audit.created), { addSuffix: true })}
          </p>
        </div>

        <div className="shrink-0">
          <AuditActionBadge actionType={audit.actionType} />
        </div>
      </div>
    </Card>
  );
}

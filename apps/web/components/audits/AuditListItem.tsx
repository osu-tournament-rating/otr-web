'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { AuditActionType, ReportEntityType } from '@otr/core/osu';

import { Card } from '@/components/ui/card';

import AuditActionBadge from './AuditActionBadge';
import AuditActorBadge from './AuditActorBadge';
import AuditChangesDisplay from './AuditChangesDisplay';
import AuditEntityBadge from './AuditEntityBadge';

const ACTION_VERBS = {
  [AuditActionType.Insert]: 'created',
  [AuditActionType.Update]: 'updated',
  [AuditActionType.Delete]: 'deleted',
} as const;

const ENTITY_TYPE_PATHS = {
  [ReportEntityType.Tournament]: 'tournament',
  [ReportEntityType.Match]: 'match',
  [ReportEntityType.Game]: 'game',
  [ReportEntityType.Score]: 'score',
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
  const auditUrl = `/audits/${ENTITY_TYPE_PATHS[audit.entityType]}/${audit.id}`;

  return (
    <Card className="hover:bg-accent/30 relative p-4 transition-colors">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="relative z-10">
            <AuditActorBadge actor={audit.actor} />
          </span>
          <span className="text-muted-foreground">{actionVerb}</span>
          <Link
            href={auditUrl}
            className="font-semibold after:absolute after:inset-0"
          >
            {audit.entityDisplayName}
          </Link>
        </div>

        {audit.actionType === AuditActionType.Update && audit.changes && (
          <AuditChangesDisplay changes={audit.changes} maxItems={3} />
        )}

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(audit.created), { addSuffix: true })}
          </p>
          <div className="flex items-center gap-2">
            <AuditEntityBadge entityType={audit.entityType} />
            <AuditActionBadge actionType={audit.actionType} />
          </div>
        </div>
      </div>
    </Card>
  );
}

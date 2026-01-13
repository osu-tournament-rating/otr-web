'use client';

import { format } from 'date-fns';

import { AuditActionType, ReportEntityType } from '@otr/core/osu';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportEntityTypeEnumHelper } from '@/lib/enums';

import AuditActorBadge from './AuditActorBadge';
import AuditActionBadge from './AuditActionBadge';
import AuditChangesDisplay from './AuditChangesDisplay';

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

export default function AuditDetailCard({ audit }: { audit: AuditRecord }) {
  const entityTypeLabel = ReportEntityTypeEnumHelper.getMetadata(
    audit.entityType
  ).text;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">
            {entityTypeLabel}: {audit.entityDisplayName}
          </CardTitle>
          <AuditActionBadge actionType={audit.actionType} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Performed by</p>
            <div className="mt-1">
              <AuditActorBadge actor={audit.actor} />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Date</p>
            <p className="mt-1 text-sm font-medium">
              {format(new Date(audit.created), 'PPpp')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Audit ID</p>
            <p className="mt-1 text-sm font-mono">{audit.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Entity ID</p>
            <p className="mt-1 text-sm font-mono">
              {audit.referenceId ?? audit.referenceIdLock}
              {!audit.referenceId && (
                <span className="text-muted-foreground ml-2">(deleted)</span>
              )}
            </p>
          </div>
        </div>

        {audit.changes && Object.keys(audit.changes).length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-sm">Changes</p>
            <div className="bg-muted/50 rounded-lg p-4">
              <AuditChangesDisplay changes={audit.changes} showAll />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

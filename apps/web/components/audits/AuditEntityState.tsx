'use client';

import Link from 'next/link';
import { AlertCircle, ExternalLink } from 'lucide-react';

import { ReportEntityType } from '@otr/core/osu';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportEntityTypeEnumHelper } from '@/lib/enums';

type AuditEntityState = {
  exists: boolean;
  data: unknown;
  entityType: ReportEntityType;
  entityDisplayName: string;
};

function getEntityLink(
  entityType: ReportEntityType,
  data: unknown
): string | null {
  if (!data || typeof data !== 'object') return null;

  const entity = data as Record<string, unknown>;

  switch (entityType) {
    case ReportEntityType.Tournament:
      return entity.id ? `/tournaments/${entity.id}` : null;
    case ReportEntityType.Match:
      return entity.id ? `/matches/${entity.id}` : null;
    case ReportEntityType.Game:
      return entity.matchId ? `/matches/${entity.matchId}` : null;
    case ReportEntityType.Score: {
      const gameData = entity.game as Record<string, unknown> | undefined;
      return gameData?.matchId ? `/matches/${gameData.matchId}` : null;
    }
    default:
      return null;
  }
}

export default function AuditEntityState({
  entityState,
}: {
  entityState: AuditEntityState;
}) {
  const entityTypeLabel = ReportEntityTypeEnumHelper.getMetadata(
    entityState.entityType
  ).text;

  if (!entityState.exists) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Entity Deleted</AlertTitle>
        <AlertDescription>
          This {entityTypeLabel.toLowerCase()} has been deleted and is no longer
          available in the system.
        </AlertDescription>
      </Alert>
    );
  }

  const entityLink = getEntityLink(entityState.entityType, entityState.data);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Current Entity State</CardTitle>
          {entityLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={entityLink}>
                View {entityTypeLabel}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          The {entityTypeLabel.toLowerCase()}{' '}
          <span className="font-semibold text-foreground">
            {entityState.entityDisplayName}
          </span>{' '}
          currently exists in the system.
        </p>
      </CardContent>
    </Card>
  );
}

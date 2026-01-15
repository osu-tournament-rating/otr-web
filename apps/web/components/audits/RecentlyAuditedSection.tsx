import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import { ReportEntityType } from '@otr/core/osu';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecentlyAuditedEntity } from '@/lib/orpc/schema/audit';

const ENTITY_TYPE_LABELS = {
  [ReportEntityType.Tournament]: 'Tournaments',
  [ReportEntityType.Match]: 'Matches',
  [ReportEntityType.Game]: 'Games',
  [ReportEntityType.Score]: 'Scores',
} as const;

const ENTITY_AUDIT_PATHS = {
  [ReportEntityType.Tournament]: (id: number) => `/tournaments/${id}/audits`,
  [ReportEntityType.Match]: (id: number) => `/matches/${id}/audits`,
  [ReportEntityType.Game]: (id: number) => `/games/${id}/audits`,
  [ReportEntityType.Score]: (id: number) => `/scores/${id}/audits`,
} as const;

interface RecentlyAuditedSectionProps {
  entityType: ReportEntityType;
  entities: RecentlyAuditedEntity[];
}

export default function RecentlyAuditedSection({
  entityType,
  entities,
}: RecentlyAuditedSectionProps) {
  const title = ENTITY_TYPE_LABELS[entityType];
  const getAuditPath = ENTITY_AUDIT_PATHS[entityType];

  if (entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No audit history available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entities.map((entity) => (
          <Link
            key={entity.referenceIdLock}
            href={getAuditPath(entity.referenceIdLock)}
            className="hover:bg-accent/50 flex items-center justify-between rounded-md p-3 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{entity.entityDisplayName}</p>
              <p className="text-muted-foreground text-xs">
                {entity.auditCount} change{entity.auditCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-muted-foreground ml-4 shrink-0 text-xs">
              {formatDistanceToNow(new Date(entity.lastAuditDate), {
                addSuffix: true,
              })}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

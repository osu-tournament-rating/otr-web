import Link from 'next/link';

import { ReportEntityType } from '@otr/core/osu';

const ENTITY_TYPE_PATHS = {
  [ReportEntityType.Tournament]: 'tournament',
  [ReportEntityType.Match]: 'match',
  [ReportEntityType.Game]: 'game',
  [ReportEntityType.Score]: 'score',
} as const;

const ENTITY_TYPE_LABELS = {
  [ReportEntityType.Tournament]: 'tournament',
  [ReportEntityType.Match]: 'match',
  [ReportEntityType.Game]: 'game',
  [ReportEntityType.Score]: 'score',
} as const;

export default function AuditEntityLink({
  auditId,
  entityType,
  entityDisplayName,
}: {
  auditId: number;
  entityType: ReportEntityType;
  entityDisplayName: string;
}) {
  const typePath = ENTITY_TYPE_PATHS[entityType];
  const typeLabel = ENTITY_TYPE_LABELS[entityType];

  return (
    <Link
      href={`/audits/${typePath}/${auditId}`}
      className="text-primary font-semibold hover:underline"
    >
      {typeLabel} {entityDisplayName}
    </Link>
  );
}

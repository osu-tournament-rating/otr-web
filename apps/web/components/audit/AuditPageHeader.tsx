import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enum-helpers';

interface AuditPageHeaderProps {
  entityType: AuditEntityType;
  entityId: number;
  entityName?: string;
}

function getEntityHref(
  entityType: AuditEntityType,
  entityId: number
): string | null {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return `/tournaments/${entityId}`;
    case AuditEntityType.Match:
      return `/matches/${entityId}`;
    default:
      return null;
  }
}

export default function AuditPageHeader({
  entityType,
  entityId,
  entityName,
}: AuditPageHeaderProps) {
  const entityMeta = AuditEntityTypeEnumHelper.getMetadata(entityType);
  const entityHref = getEntityHref(entityType, entityId);

  return (
    <div data-testid="audit-page-header" className="flex flex-col gap-3">
      {/* Breadcrumb */}
      <nav
        data-testid="audit-breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link
          data-testid="audit-breadcrumb-link"
          href="/tools/audit-logs"
          className="transition-colors hover:text-foreground"
        >
          Audit Logs
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{entityMeta.text}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">#{entityId}</span>
      </nav>

      {/* Title row */}
      <div className="flex items-center gap-3">
        <h1
          data-testid="audit-entity-title"
          className="text-xl font-bold sm:text-2xl"
        >
          {entityMeta.text} #{entityId}
        </h1>
        {entityHref && (
          <Link
            data-testid="audit-view-entity-link"
            href={entityHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View {entityMeta.text.toLowerCase()}
          </Link>
        )}
      </div>

      {/* Entity name subtitle */}
      {entityName && (
        <p className="text-sm text-muted-foreground">{entityName}</p>
      )}
    </div>
  );
}

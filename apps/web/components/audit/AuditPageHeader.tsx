import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';

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
    <div className="flex flex-col gap-3">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link
          href="/tools/audit-logs"
          className="hover:text-foreground transition-colors"
        >
          Audit Logs
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{entityMeta.text}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">#{entityId}</span>
      </nav>

      {/* Title row */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          {entityMeta.text} #{entityId}
        </h1>
        {entityHref && (
          <Link
            href={entityHref}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View {entityMeta.text.toLowerCase()}
          </Link>
        )}
      </div>

      {/* Entity name subtitle */}
      {entityName && (
        <p className="text-muted-foreground text-sm">{entityName}</p>
      )}
    </div>
  );
}

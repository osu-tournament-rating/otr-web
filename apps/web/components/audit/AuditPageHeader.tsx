import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
    <div className="flex flex-col gap-2">
      <nav className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link
          href="/tools/audit-logs"
          className="hover:text-primary transition-colors"
        >
          Audit Logs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{entityMeta.text}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">#{entityId}</span>
      </nav>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">
          {entityMeta.text} Audit History
        </h1>
        {entityHref && (
          <Link
            href={entityHref}
            className="text-primary text-sm hover:underline"
          >
            View {entityMeta.text.toLowerCase()}
          </Link>
        )}
      </div>

      {entityName && (
        <p className="text-muted-foreground text-sm">{entityName}</p>
      )}
    </div>
  );
}

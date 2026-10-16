import { History } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';

import { PageHeader } from '@/components/kit/layout/PageHeader';
import { ENTITY_TYPE_LABELS } from '@/lib/audit-entity-types';
import { formatId } from '@/lib/kit/format/number';
import { getEntityTypeName, nameOr } from './auditParams';

interface AuditPageHeaderProps {
  entityType: AuditEntityType;
  entityId: number;
  entityName?: string;
}

/** The entity's own page, where it has one; otherwise back to the audit log. */
function getBackLink(
  entityType: AuditEntityType,
  entityId: number
): { href: string; label: string } {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return { href: `/tournaments/${entityId}`, label: 'View tournament' };
    case AuditEntityType.Match:
      return { href: `/matches/${entityId}`, label: 'View match' };
    default:
      return { href: '/tools/audit-logs', label: 'Audit logs' };
  }
}

/** The entity's name, or "Tournament #775" when it has none. */
export function getAuditEntityTitle(
  entityType: AuditEntityType,
  entityId: number,
  entityName?: string | null
): string {
  return nameOr(
    entityName,
    `${getEntityTypeName(entityType)} #${formatId(entityId)}`
  );
}

/**
 * The top of an audit history page: the entity's name as the title, a link
 * back to the entity (or the audit log, for entities without a page), and
 * which record this is.
 */
export default function AuditPageHeader({
  entityType,
  entityId,
  entityName,
}: AuditPageHeaderProps) {
  const reference = `${ENTITY_TYPE_LABELS[entityType]} #${formatId(entityId)}`;

  return (
    <PageHeader
      data-testid="audit-page-header"
      icon={History}
      back={getBackLink(entityType, entityId)}
      title={
        <span data-testid="audit-entity-title">
          {getAuditEntityTitle(entityType, entityId, entityName)}
        </span>
      }
      description={
        <span data-testid="audit-entity-description">
          Audit history for {reference}
        </span>
      }
    />
  );
}

import { History } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';

import { PageHeader } from '@/components/kit/layout/PageHeader';
import { ENTITY_TYPE_LABELS } from '@/lib/audit-entity-types';
import { formatId } from '@/lib/kit/format/number';
import { getEntityTypeName, nameOr } from './auditParams';

export type AuditBackLink = { href: string; label: string };

interface AuditPageHeaderProps {
  entityType: AuditEntityType;
  entityId: number;
  entityName?: string;
  /**
   * The way back when the entity's page isn't at its ID: a beatmap's page
   * at its osu! ID, or the match page a game or score sits on.
   */
  back?: AuditBackLink;
}

/**
 * Tournaments and matches open at their ID; anything else goes back to the
 * audit log unless its page passes `back`.
 */
function getBackLink(
  entityType: AuditEntityType,
  entityId: number
): AuditBackLink {
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
  back,
}: AuditPageHeaderProps) {
  const reference = `${ENTITY_TYPE_LABELS[entityType]} #${formatId(entityId)}`;

  return (
    <PageHeader
      data-testid="audit-page-header"
      icon={History}
      back={back ?? getBackLink(entityType, entityId)}
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

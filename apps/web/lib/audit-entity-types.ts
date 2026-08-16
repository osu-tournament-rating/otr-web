import { AuditEntityType } from '@otr/core/osu';

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournament',
  [AuditEntityType.Match]: 'match',
  [AuditEntityType.Game]: 'game',
  [AuditEntityType.Score]: 'score',
};

export const ENTITY_TYPE_PLURALS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournaments',
  [AuditEntityType.Match]: 'matches',
  [AuditEntityType.Game]: 'games',
  [AuditEntityType.Score]: 'scores',
};

/** URL path slug for an entity type. */
export function entityTypeToSlug(entityType: AuditEntityType): string {
  return ENTITY_TYPE_PLURALS[entityType];
}

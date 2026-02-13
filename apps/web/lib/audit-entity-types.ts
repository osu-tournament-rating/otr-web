import { AuditEntityType } from '@otr/core/osu';

/** Entity type display labels (singular) */
export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournament',
  [AuditEntityType.Match]: 'match',
  [AuditEntityType.Game]: 'game',
  [AuditEntityType.Score]: 'score',
};

/** Entity type display labels (plural) */
export const ENTITY_TYPE_PLURALS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournaments',
  [AuditEntityType.Match]: 'matches',
  [AuditEntityType.Game]: 'games',
  [AuditEntityType.Score]: 'scores',
};

/** Entity type slug for URL paths */
export function entityTypeToSlug(entityType: AuditEntityType): string {
  return ENTITY_TYPE_PLURALS[entityType];
}

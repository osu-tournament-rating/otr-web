import { AuditEntityType } from '@otr/core/osu';

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournament',
  [AuditEntityType.Match]: 'match',
  [AuditEntityType.Game]: 'game',
  [AuditEntityType.Score]: 'score',
  [AuditEntityType.Beatmap]: 'beatmap',
};

export const ENTITY_TYPE_PLURALS: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournaments',
  [AuditEntityType.Match]: 'matches',
  [AuditEntityType.Game]: 'games',
  [AuditEntityType.Score]: 'scores',
  [AuditEntityType.Beatmap]: 'beatmaps',
};

/** URL path slug for an entity type. */
export function entityTypeToSlug(entityType: AuditEntityType): string {
  return ENTITY_TYPE_PLURALS[entityType];
}

/** Everything below an entity in the hierarchy, nearest first. */
export function getDescendantTypes(
  entityType: AuditEntityType
): AuditEntityType[] {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return [
        AuditEntityType.Match,
        AuditEntityType.Game,
        AuditEntityType.Score,
      ];
    case AuditEntityType.Match:
      return [AuditEntityType.Game, AuditEntityType.Score];
    case AuditEntityType.Game:
      return [AuditEntityType.Score];
    case AuditEntityType.Score:
      return [];
    case AuditEntityType.Beatmap:
      return [];
  }
}

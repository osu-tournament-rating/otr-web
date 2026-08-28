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

const numberFormat = new Intl.NumberFormat('en-US');

/** "of 118 matches" while some children went untouched, otherwise just "matches". */
export function childCountTail(
  entityType: AuditEntityType,
  affectedCount: number,
  totalCount: number | null
): string {
  const showsTotal = totalCount !== null && totalCount > affectedCount;
  const counted = showsTotal ? totalCount : affectedCount;
  const label =
    counted === 1
      ? ENTITY_TYPE_LABELS[entityType]
      : ENTITY_TYPE_PLURALS[entityType];
  return showsTotal ? `of ${numberFormat.format(counted)} ${label}` : label;
}

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

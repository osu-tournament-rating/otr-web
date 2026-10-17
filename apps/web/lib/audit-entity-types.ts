import { AuditEntityType } from '@otr/core/osu';

import { formatCount } from '@/lib/kit/format/number';

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

/** "match" for one, "matches" for any other count. */
export function entityNoun(entityType: AuditEntityType, count: number): string {
  return count === 1
    ? ENTITY_TYPE_LABELS[entityType]
    : ENTITY_TYPE_PLURALS[entityType];
}

/**
 * How many entities an event touched: "85 of 118 matches" while some went
 * untouched, otherwise "118 matches".
 */
export function formatAffectedCount(
  entityType: AuditEntityType,
  affectedCount: number,
  totalCount: number | null
): string {
  if (totalCount !== null && totalCount > affectedCount) {
    return `${formatCount(affectedCount)} of ${formatCount(totalCount)} ${entityNoun(entityType, totalCount)}`;
  }
  return `${formatCount(affectedCount)} ${entityNoun(entityType, affectedCount)}`;
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

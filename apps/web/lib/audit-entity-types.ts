import { AuditEntityType } from '@otr/core/osu';

/** Entity type slug for URL paths */
export function entityTypeToSlug(entityType: AuditEntityType): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return 'tournaments';
    case AuditEntityType.Match:
      return 'matches';
    case AuditEntityType.Game:
      return 'games';
    case AuditEntityType.Score:
      return 'scores';
  }
}

import { AuditEntityType } from '@otr/core/osu';
import { getDescendantTypes } from '@/lib/audit-entity-types';

type AncestryInfo = {
  /** FROM clause aliasing the audit table as `a` and joining its ancestors. */
  fromClause: string;
  ancestorIdExpr: Partial<Record<AuditEntityType, string>>;
  /** Null for entity types with no name column. */
  nameExpr: string | null;
};

const ANCESTRY: Record<AuditEntityType, AncestryInfo> = {
  [AuditEntityType.Tournament]: {
    fromClause:
      'tournament_audits a JOIN tournaments t ON t.id = a.reference_id_lock',
    ancestorIdExpr: {},
    nameExpr: 't.name',
  },
  [AuditEntityType.Match]: {
    fromClause: 'match_audits a JOIN matches m ON m.id = a.reference_id_lock',
    ancestorIdExpr: { [AuditEntityType.Tournament]: 'm.tournament_id' },
    nameExpr: 'm.name',
  },
  [AuditEntityType.Game]: {
    fromClause:
      'game_audits a JOIN games g ON g.id = a.reference_id_lock JOIN matches m ON m.id = g.match_id',
    ancestorIdExpr: {
      [AuditEntityType.Tournament]: 'm.tournament_id',
      [AuditEntityType.Match]: 'g.match_id',
    },
    nameExpr: null,
  },
  [AuditEntityType.Score]: {
    fromClause:
      'game_score_audits a JOIN game_scores gs ON gs.id = a.reference_id_lock JOIN games g ON g.id = gs.game_id JOIN matches m ON m.id = g.match_id',
    ancestorIdExpr: {
      [AuditEntityType.Tournament]: 'm.tournament_id',
      [AuditEntityType.Match]: 'g.match_id',
      [AuditEntityType.Game]: 'gs.game_id',
    },
    nameExpr: null,
  },
};

const PATH_EXPRESSIONS: Partial<
  Record<AuditEntityType, Partial<Record<AuditEntityType, string>>>
> = {
  [AuditEntityType.Game]: { [AuditEntityType.Match]: 'g.match_id' },
  [AuditEntityType.Score]: {
    [AuditEntityType.Match]: 'g.match_id',
    [AuditEntityType.Game]: 'gs.game_id',
  },
};

export type AncestryJoinInfo = {
  fromClause: string;
  ancestorIdExpr: string;
  nameExpr: string | null;
  /** Levels between the ancestor and the descendant, outermost first. */
  pathExprs: { entityType: AuditEntityType; expr: string }[];
};

/** Null when `descendantType` is not below `ancestorType`. */
export function getAncestryJoinInfo(
  descendantType: AuditEntityType,
  ancestorType: AuditEntityType
): AncestryJoinInfo | null {
  const info = ANCESTRY[descendantType];
  const ancestorIdExpr = info.ancestorIdExpr[ancestorType];
  if (!ancestorIdExpr) return null;

  const pathExprs = getDescendantTypes(ancestorType)
    .filter((entityType) => entityType !== descendantType)
    .flatMap((entityType) => {
      const expr = PATH_EXPRESSIONS[descendantType]?.[entityType];
      return expr ? [{ entityType, expr }] : [];
    });

  return {
    fromClause: info.fromClause,
    ancestorIdExpr,
    nameExpr: info.nameExpr,
    pathExprs,
  };
}

import { sql, type SQL } from 'drizzle-orm';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
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
  // Beatmaps sit outside the tournament hierarchy.
  [AuditEntityType.Beatmap]: {
    fromClause:
      'beatmap_audits a JOIN beatmaps b ON b.id = a.reference_id_lock',
    ancestorIdExpr: {},
    nameExpr: 'b.diff_name',
  },
};

export type DeletedDescendantInfo = {
  /** FROM clause aliasing the audit table as `a` and the descendant's deletion as `d`. */
  fromClause: string;
  /** Limits `d` to deletions made while the descendant sat under the ancestor. */
  ancestorScope: (ancestorId: number) => SQL;
  nameExpr: string;
};

/**
 * A deleted row drops out of the joins in {@link ANCESTRY}, taking its history
 * with it. Its deletion audit still records the parent it was deleted from.
 */
const DELETED_ANCESTRY: Partial<
  Record<
    AuditEntityType,
    Partial<Record<AuditEntityType, DeletedDescendantInfo>>
  >
> = {
  [AuditEntityType.Match]: {
    [AuditEntityType.Tournament]: {
      fromClause:
        'match_audits a JOIN match_audits d ON d.reference_id_lock = a.reference_id_lock',
      ancestorScope: (tournamentId) => {
        const deletedFrom = { tournament_id: { originalValue: tournamentId } };
        // Containment so ix_match_audits_changes_gin finds the deletions.
        return sql`d.action_type = ${AuditActionType.Deleted}
          AND d.changes @> ${JSON.stringify(deletedFrom)}::jsonb`;
      },
      // Matches deleted before their data was fetched have an empty name.
      nameExpr: "NULLIF(d.changes -> 'name' ->> 'originalValue', '')",
    },
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
  /** Only set for a direct child, so its rows need no path. */
  deleted: DeletedDescendantInfo | null;
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
    deleted: DELETED_ANCESTRY[descendantType]?.[ancestorType] ?? null,
  };
}

const AUDIT_COLUMNS = [
  sql`a.id`,
  sql`a.created`,
  sql`a.reference_id_lock`,
  sql`a.reference_id`,
  sql`a.action_user_id`,
  sql`a.action_type`,
  sql`a.changes`,
];

export function pathColumn(entityType: AuditEntityType): string {
  return `path_${entityType}`;
}

/** Audit rows under the entity, each with its descendant's name and path ids. */
export function buildScopedAuditRows(
  info: AncestryJoinInfo,
  entityId: number,
  showSystem: boolean | undefined
): SQL {
  // System rows carry no action user; they are noise unless explicitly requested.
  const userFilter = showSystem
    ? sql``
    : sql` AND a.action_user_id IS NOT NULL`;

  const nameSelection = info.nameExpr
    ? sql`${sql.raw(info.nameExpr)} AS entity_name`
    : sql`NULL::text AS entity_name`;
  const pathSelections = info.pathExprs.map(
    ({ entityType: pathType, expr }) =>
      sql`${sql.raw(expr)} AS ${sql.raw(pathColumn(pathType))}`
  );

  const live = sql`
    SELECT ${sql.join([...AUDIT_COLUMNS, nameSelection, ...pathSelections], sql`, `)}
    FROM ${sql.raw(info.fromClause)}
    WHERE ${sql.raw(info.ancestorIdExpr)} = ${entityId}${userFilter}
  `;

  if (!info.deleted) return live;

  const { deleted } = info;
  return sql`
    ${live}
    UNION ALL
    SELECT ${sql.join(AUDIT_COLUMNS, sql`, `)}, ${sql.raw(deleted.nameExpr)} AS entity_name
    FROM ${sql.raw(deleted.fromClause)}
    WHERE ${deleted.ancestorScope(entityId)}${userFilter}
  `;
}

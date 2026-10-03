import { describe, expect, it } from 'bun:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';

import { buildScopedAuditRows, getAncestryJoinInfo } from '../ancestry';

const dialect = new PgDialect();

describe('getAncestryJoinInfo', () => {
  it('scopes match audits to a tournament', () => {
    const info = getAncestryJoinInfo(
      AuditEntityType.Match,
      AuditEntityType.Tournament
    );

    expect(info).not.toBeNull();
    expect(info!.ancestorIdExpr).toBe('m.tournament_id');
    expect(info!.nameExpr).toBe('m.name');
    expect(info!.pathExprs).toEqual([]);
  });

  it('walks scores up to a tournament through games and matches', () => {
    const info = getAncestryJoinInfo(
      AuditEntityType.Score,
      AuditEntityType.Tournament
    );

    expect(info!.ancestorIdExpr).toBe('m.tournament_id');
    expect(info!.nameExpr).toBeNull();
    expect(info!.pathExprs).toEqual([
      { entityType: AuditEntityType.Match, expr: 'g.match_id' },
      { entityType: AuditEntityType.Game, expr: 'gs.game_id' },
    ]);
  });

  it('drops the match level when scoping scores to a match', () => {
    const info = getAncestryJoinInfo(
      AuditEntityType.Score,
      AuditEntityType.Match
    );

    expect(info!.ancestorIdExpr).toBe('g.match_id');
    expect(info!.pathExprs).toEqual([
      { entityType: AuditEntityType.Game, expr: 'gs.game_id' },
    ]);
  });

  it('returns null when the type is not a descendant', () => {
    expect(
      getAncestryJoinInfo(AuditEntityType.Match, AuditEntityType.Game)
    ).toBeNull();
    expect(
      getAncestryJoinInfo(AuditEntityType.Tournament, AuditEntityType.Match)
    ).toBeNull();
  });

  it('joins every level a score audit needs', () => {
    const info = getAncestryJoinInfo(
      AuditEntityType.Score,
      AuditEntityType.Tournament
    );

    expect(info!.fromClause).toContain('game_score_audits a');
    expect(info!.fromClause).toContain(
      'JOIN game_scores gs ON gs.id = a.reference_id_lock'
    );
    expect(info!.fromClause).toContain('JOIN games g ON g.id = gs.game_id');
    expect(info!.fromClause).toContain('JOIN matches m ON m.id = g.match_id');
  });
});

describe('buildScopedAuditRows', () => {
  const render = (
    descendantType: AuditEntityType,
    ancestorType: AuditEntityType,
    showSystem = false
  ) =>
    dialect.sqlToQuery(
      buildScopedAuditRows(
        getAncestryJoinInfo(descendantType, ancestorType)!,
        42,
        showSystem
      )
    );

  it('keeps matches deleted from the tournament', () => {
    const { sql, params } = render(
      AuditEntityType.Match,
      AuditEntityType.Tournament
    );

    expect(sql).toContain('UNION ALL');
    expect(sql).toContain(
      'match_audits a JOIN match_audits d ON d.reference_id_lock = a.reference_id_lock'
    );
    expect(params).toEqual([
      42,
      AuditActionType.Deleted,
      JSON.stringify({ tournament_id: { originalValue: 42 } }),
    ]);
  });

  it('hides system rows of deleted matches too', () => {
    const { sql } = render(AuditEntityType.Match, AuditEntityType.Tournament);
    const [live, deleted] = sql.split('UNION ALL');

    expect(live).toContain('a.action_user_id IS NOT NULL');
    expect(deleted).toContain('a.action_user_id IS NOT NULL');
  });

  it('shows system rows when asked', () => {
    const { sql } = render(
      AuditEntityType.Match,
      AuditEntityType.Tournament,
      true
    );

    expect(sql).not.toContain('action_user_id IS NOT NULL');
  });

  it('only reads live rows below the match level', () => {
    const { sql, params } = render(
      AuditEntityType.Score,
      AuditEntityType.Tournament
    );

    expect(sql).not.toContain('UNION ALL');
    expect(sql).toContain('g.match_id AS path_1');
    expect(sql).toContain('gs.game_id AS path_2');
    expect(params).toEqual([42]);
  });
});

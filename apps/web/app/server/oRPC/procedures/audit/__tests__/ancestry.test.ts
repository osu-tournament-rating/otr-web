import { describe, expect, it } from 'bun:test';
import { AuditEntityType } from '@otr/core/osu';

import { getAncestryJoinInfo } from '../ancestry';

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

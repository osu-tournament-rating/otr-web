import { describe, expect, it } from 'bun:test';
import { AuditEntityType } from '@otr/core/osu';

import { formatAffectedCount } from '@/lib/audit-entity-types';
import {
  formatBreakdownClause,
  formatBreakdownSummary,
  getBreakdownSummaryParts,
} from '../ActionBreakdownPhrase';

describe('formatAffectedCount', () => {
  it('counts every entity when the event touched them all', () => {
    expect(formatAffectedCount(AuditEntityType.Match, 118, 118)).toBe(
      '118 matches'
    );
    expect(formatAffectedCount(AuditEntityType.Match, 118, null)).toBe(
      '118 matches'
    );
  });

  it('names the total while some went untouched', () => {
    expect(formatAffectedCount(AuditEntityType.Match, 85, 118)).toBe(
      '85 of 118 matches'
    );
    expect(formatAffectedCount(AuditEntityType.Score, 1, 1204)).toBe(
      '1 of 1,204 scores'
    );
  });

  it('keeps one entity singular', () => {
    expect(formatAffectedCount(AuditEntityType.Game, 1, 1)).toBe('1 game');
  });

  it('ignores a live total below a historical count', () => {
    expect(formatAffectedCount(AuditEntityType.Match, 12, 10)).toBe(
      '12 matches'
    );
  });
});

describe('formatBreakdownSummary', () => {
  it('reads a mixed cascade naturally', () => {
    expect(
      formatBreakdownSummary(
        [
          { action: 'verification', count: 57 },
          { action: 'rejection', count: 1 },
        ],
        AuditEntityType.Match
      )
    ).toBe('58 matches: 57 verified, 1 rejected');
  });

  it('names the total while some children went untouched', () => {
    expect(
      formatBreakdownSummary(
        [
          { action: 'verification', count: 115 },
          { action: 'rejection', count: 3 },
        ],
        AuditEntityType.Match,
        1200
      )
    ).toBe('118 of 1,200 matches: 115 verified, 3 rejected');
  });

  it('puts a single outcome after the count', () => {
    expect(
      formatBreakdownSummary(
        [{ action: 'pre_verification', count: 85 }],
        AuditEntityType.Match,
        118
      )
    ).toBe('85 of 118 matches pre-verified');
  });
});

describe('getBreakdownSummaryParts', () => {
  it('splits after the colon, where a narrow label wraps', () => {
    expect(
      getBreakdownSummaryParts(
        [
          { action: 'verification', count: 176 },
          { action: 'rejection', count: 44 },
        ],
        AuditEntityType.Game,
        229
      )
    ).toEqual(['220 of 229 games:', '176 verified, 44 rejected']);
  });

  it('keeps a single outcome as its own part', () => {
    expect(
      getBreakdownSummaryParts(
        [{ action: 'pre_verification', count: 85 }],
        AuditEntityType.Match,
        118
      )
    ).toEqual(['85 of 118 matches', 'pre-verified']);
  });
});

describe('formatBreakdownClause', () => {
  it('joins two outcomes over one count', () => {
    expect(
      formatBreakdownClause(
        [
          { action: 'verification', count: 3 },
          { action: 'rejection', count: 1 },
        ],
        AuditEntityType.Match,
        4
      )
    ).toBe('verified 3 and rejected 1 of 4 matches');
  });

  it('lists three outcomes with commas', () => {
    expect(
      formatBreakdownClause(
        [
          { action: 'verification', count: 1200 },
          { action: 'pre_verification', count: 2 },
          { action: 'rejection', count: 1 },
        ],
        AuditEntityType.Score
      )
    ).toBe('verified 1,200, pre-verified 2, and rejected 1 of 1,203 scores');
  });

  it('reads a single outcome as a plain count', () => {
    expect(
      formatBreakdownClause(
        [{ action: 'pre_verification', count: 12 }],
        AuditEntityType.Game
      )
    ).toBe('pre-verified 12 games');
  });
});

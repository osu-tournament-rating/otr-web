import { describe, expect, it } from 'bun:test';
import {
  GameRejectionReason,
  MatchRejectionReason,
  TeamType,
} from '@otr/core/osu';

import {
  formatEnumValue,
  formatFlags,
  getFlagLabels,
  GAME_REJECTION_REASON_LABELS,
  MATCH_REJECTION_REASON_LABELS,
  RANKED_STATUS_LABELS,
  TEAM_TYPE_LABELS,
} from '../enum-labels';

describe('formatEnumValue', () => {
  it('names a value', () => {
    expect(formatEnumValue(TeamType.TeamVs, TEAM_TYPE_LABELS)).toBe('Team Vs');
    expect(formatEnumValue(-2, RANKED_STATUS_LABELS)).toBe('Graveyard');
    expect(formatEnumValue(4, RANKED_STATUS_LABELS)).toBe('Loved');
  });

  it('says when a value has no name', () => {
    expect(formatEnumValue(9, TEAM_TYPE_LABELS)).toBe('Unknown (9)');
  });
});

describe('getFlagLabels', () => {
  it('lists the set flags in bit order', () => {
    expect(
      getFlagLabels(
        GameRejectionReason.RejectedMatch | GameRejectionReason.NoScores,
        GAME_REJECTION_REASON_LABELS
      )
    ).toEqual(['No scores', 'Rejected match']);
  });

  it('gives nothing for zero or values that are not flags', () => {
    expect(getFlagLabels(0, GAME_REJECTION_REASON_LABELS)).toEqual([]);
    expect(getFlagLabels(-1, GAME_REJECTION_REASON_LABELS)).toEqual([]);
    expect(getFlagLabels(1.5, GAME_REJECTION_REASON_LABELS)).toEqual([]);
  });

  it('reports bits that have no name', () => {
    expect(getFlagLabels(1 | 4096, MATCH_REJECTION_REASON_LABELS)).toEqual([
      'No data',
      'Unknown (4096)',
    ]);
  });
});

describe('formatFlags', () => {
  it('names every set flag in bit order', () => {
    expect(
      formatFlags(
        GameRejectionReason.InvalidMods | GameRejectionReason.NoScores,
        GAME_REJECTION_REASON_LABELS
      )
    ).toBe('No scores, Invalid mods');
  });

  it('reads zero as the none label', () => {
    expect(formatFlags(0, MATCH_REJECTION_REASON_LABELS)).toBe('None');
  });

  it('keeps one shared wording across entities', () => {
    expect(
      formatFlags(MatchRejectionReason.NoEndTime, MATCH_REJECTION_REASON_LABELS)
    ).toBe(
      formatFlags(GameRejectionReason.NoEndTime, GAME_REJECTION_REASON_LABELS)
    );
  });

  it('reports bits that have no name', () => {
    expect(formatFlags(1 | 4096, MATCH_REJECTION_REASON_LABELS)).toBe(
      'No data, Unknown (4096)'
    );
  });

  it('prints an em dash for values that are not flags', () => {
    expect(formatFlags(-1, MATCH_REJECTION_REASON_LABELS)).toBe('—');
  });
});

describe('label wording', () => {
  it('is sentence case', () => {
    const tables = [
      GAME_REJECTION_REASON_LABELS,
      MATCH_REJECTION_REASON_LABELS,
    ];
    for (const labels of tables) {
      for (const label of Object.values(labels)) {
        for (const word of label.split(' ').slice(1)) {
          expect(
            word === word.toLowerCase() || ['Team', 'Vs'].includes(word)
          ).toBe(true);
        }
      }
    }
  });
});

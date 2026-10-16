import { describe, expect, it } from 'bun:test';

import {
  GameWarningFlags,
  MatchRejectionReason,
  MatchWarningFlags,
  ScoreRejectionReason,
} from '@otr/core/osu';
import {
  GAME_WARNING_FLAG_LABELS,
  MATCH_REJECTION_REASON_LABELS,
  MATCH_WARNING_FLAG_LABELS,
  SCORE_REJECTION_REASON_LABELS,
} from '@/lib/kit/format/enum-labels';
import { getRejectionReasonTexts, getWarningTexts } from '../reasons';

// The wording belongs to the format family; these tests check flag handling.

describe('getWarningTexts', () => {
  it('gives one line per set warning flag, in flag order', () => {
    expect(
      getWarningTexts(
        'match',
        MatchWarningFlags.OverlappingRosters | MatchWarningFlags.LowGameCount
      )
    ).toEqual([
      MATCH_WARNING_FLAG_LABELS[MatchWarningFlags.LowGameCount],
      MATCH_WARNING_FLAG_LABELS[MatchWarningFlags.OverlappingRosters],
    ]);
  });

  it('reads game warnings', () => {
    expect(getWarningTexts('game', GameWarningFlags.BeatmapUsedOnce)).toEqual([
      GAME_WARNING_FLAG_LABELS[GameWarningFlags.BeatmapUsedOnce],
    ]);
  });

  it('returns nothing for no flags or for entities without warnings', () => {
    expect(getWarningTexts('match', MatchWarningFlags.None)).toEqual([]);
    expect(getWarningTexts('match', null)).toEqual([]);
    expect(getWarningTexts('score', 1)).toEqual([]);
    expect(getWarningTexts('tournament', 1)).toEqual([]);
  });

  it('names bits it has no label for instead of dropping them', () => {
    expect(
      getWarningTexts('game', GameWarningFlags.BeatmapUsedOnce | 8)
    ).toEqual([
      GAME_WARNING_FLAG_LABELS[GameWarningFlags.BeatmapUsedOnce],
      'Unknown (8)',
    ]);
  });
});

describe('getRejectionReasonTexts', () => {
  it('gives one line per set rejection flag', () => {
    expect(
      getRejectionReasonTexts(
        'match',
        MatchRejectionReason.NoGames | MatchRejectionReason.NoEndTime
      )
    ).toEqual([
      MATCH_REJECTION_REASON_LABELS[MatchRejectionReason.NoGames],
      MATCH_REJECTION_REASON_LABELS[MatchRejectionReason.NoEndTime],
    ]);
  });

  it('reads score reasons', () => {
    expect(
      getRejectionReasonTexts('score', ScoreRejectionReason.RejectedGame)
    ).toEqual([
      SCORE_REJECTION_REASON_LABELS[ScoreRejectionReason.RejectedGame],
    ]);
  });

  it('returns nothing when there is no reason', () => {
    expect(getRejectionReasonTexts('tournament', 0)).toEqual([]);
    expect(getRejectionReasonTexts('game', undefined)).toEqual([]);
    expect(getRejectionReasonTexts('match', -1)).toEqual([]);
  });
});

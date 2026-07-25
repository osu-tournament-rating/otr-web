import { describe, expect, it } from 'bun:test';

import { ReportEntityType } from '@otr/core/osu';

import {
  getReportReason,
  getReportReasons,
  SOMETHING_ELSE_REPORT_REASON,
} from '../reportTemplates';

const expectedReasons: Record<ReportEntityType, Array<[string, string]>> = {
  [ReportEntityType.Tournament]: [
    ['incorrect-tournament-details', 'Incorrect tournament details'],
    ['missing-match-data', 'Missing match data'],
    ['incorrect-match-data', 'Incorrect match data'],
    ['missing-mappool-data', 'Missing mappool data'],
    ['invalid-tournament-format', 'Invalid tournament format'],
    ['verification-appeal', 'Verification appeal'],
    ['incorrect-beatmap-or-mod', 'Incorrect beatmap or mod'],
  ],
  [ReportEntityType.Match]: [
    ['invalid-match', 'Invalid match'],
    ['incorrect-match-details', 'Incorrect match details'],
    ['incorrect-match-result', 'Incorrect match result'],
    ['player-eligibility-issue', 'Player eligibility issue'],
    ['missing-games', 'Missing games'],
    ['duplicate-match', 'Duplicate match'],
  ],
  [ReportEntityType.Game]: [
    ['invalid-game', 'Invalid game'],
    ['incorrect-game-result', 'Incorrect game result'],
    ['wrong-beatmap-or-mods', 'Wrong beatmap or mods'],
    ['wrong-players-or-teams', 'Wrong players or teams'],
    ['incorrect-game-details', 'Incorrect game details'],
    ['duplicate-game', 'Duplicate game'],
  ],
  [ReportEntityType.Score]: [
    ['invalid-score', 'Invalid score'],
    ['incorrect-score-value', 'Incorrect score value'],
    ['wrong-player', 'Wrong player'],
    ['wrong-team', 'Wrong team'],
    ['wrong-mods', 'Wrong mods'],
    ['missing-score', 'Missing score'],
    ['duplicate-score', 'Duplicate score'],
  ],
};

describe('report reason templates', () => {
  for (const entityType of [
    ReportEntityType.Tournament,
    ReportEntityType.Match,
    ReportEntityType.Game,
    ReportEntityType.Score,
  ]) {
    it(`returns the expected reasons for entity type ${entityType}`, () => {
      const reasons = getReportReasons(entityType);

      expect(reasons.map(({ key, label }) => [key, label])).toEqual([
        ...expectedReasons[entityType],
        [SOMETHING_ELSE_REPORT_REASON.key, SOMETHING_ELSE_REPORT_REASON.label],
      ]);
      expect(reasons.at(-1)).toEqual(SOMETHING_ELSE_REPORT_REASON);
      expect(new Set(reasons.map(({ key }) => key)).size).toBe(reasons.length);
      expect(new Set(reasons.map(({ label }) => label)).size).toBe(
        reasons.length
      );
      expect(reasons.length).toBeLessThanOrEqual(8);
    });
  }

  it('only resolves reasons belonging to the requested entity type', () => {
    expect(
      getReportReason(ReportEntityType.Match, 'incorrect-match-result')
    ).toEqual({
      key: 'incorrect-match-result',
      label: 'Incorrect match result',
    });
    expect(
      getReportReason(ReportEntityType.Game, 'incorrect-match-result')
    ).toBeUndefined();
  });
});

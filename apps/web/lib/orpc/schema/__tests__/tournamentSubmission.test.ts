import { describe, expect, test } from 'bun:test';

import {
  MAX_SUBMISSION_IDS,
  TournamentSubmissionInputSchema,
  tournamentSubmissionFormSchema,
} from '../tournamentSubmission';

const sequentialIds = (count: number) =>
  Array.from({ length: count }, (_, index) => index + 1);

const submission = (ids: number[], beatmapIds: number[]) => ({
  name: 'Test Tournament',
  abbreviation: 'TT',
  forumUrl: 'https://osu.ppy.sh/community/forums/topics/1',
  ruleset: 0,
  rankRangeLowerBound: 1,
  lobbySize: 2,
  ids,
  beatmapIds,
});

const issuePaths = (result: {
  error?: { issues: { path: PropertyKey[] }[] };
}) => result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe.each([
  ['input schema', TournamentSubmissionInputSchema],
  ['form schema', tournamentSubmissionFormSchema],
] as const)('%s id limits', (_, schema) => {
  test('accepts the maximum number of match and beatmap ids', () => {
    const result = schema.safeParse(
      submission(
        sequentialIds(MAX_SUBMISSION_IDS),
        sequentialIds(MAX_SUBMISSION_IDS)
      )
    );

    expect(issuePaths(result)).toEqual([]);
  });

  test('rejects one match id over the maximum', () => {
    const result = schema.safeParse(
      submission(sequentialIds(MAX_SUBMISSION_IDS + 1), [])
    );

    expect(issuePaths(result)).toContain('ids');
  });

  test('rejects one beatmap id over the maximum', () => {
    const result = schema.safeParse(
      submission([1], sequentialIds(MAX_SUBMISSION_IDS + 1))
    );

    expect(issuePaths(result)).toContain('beatmapIds');
  });
});

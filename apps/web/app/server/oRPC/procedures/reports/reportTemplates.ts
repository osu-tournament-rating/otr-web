import { ReportEntityType } from '@otr/core/osu/enums';

import type { ReportReason } from '@/lib/orpc/schema/report';

export const SOMETHING_ELSE_REPORT_REASON = {
  key: 'something-else',
  label: 'Something else',
} as const satisfies ReportReason;

const ENTITY_REPORT_REASONS = {
  [ReportEntityType.Tournament]: [
    {
      key: 'incorrect-tournament-details',
      label: 'Incorrect tournament details',
    },
    { key: 'missing-match-data', label: 'Missing match data' },
    { key: 'incorrect-match-data', label: 'Incorrect match data' },
    { key: 'missing-mappool-data', label: 'Missing mappool data' },
    {
      key: 'invalid-tournament-format',
      label: 'Invalid tournament format',
    },
    { key: 'verification-appeal', label: 'Verification appeal' },
    {
      key: 'incorrect-beatmap-or-mod',
      label: 'Incorrect beatmap or mod',
    },
  ],
  [ReportEntityType.Match]: [
    { key: 'invalid-match', label: 'Invalid match' },
    { key: 'incorrect-match-details', label: 'Incorrect match details' },
    { key: 'incorrect-match-result', label: 'Incorrect match result' },
    { key: 'player-eligibility-issue', label: 'Player eligibility issue' },
    { key: 'missing-games', label: 'Missing games' },
    { key: 'duplicate-match', label: 'Duplicate match' },
  ],
  [ReportEntityType.Game]: [
    { key: 'invalid-game', label: 'Invalid game' },
    { key: 'incorrect-game-result', label: 'Incorrect game result' },
    { key: 'wrong-beatmap-or-mods', label: 'Wrong beatmap or mods' },
    { key: 'wrong-players-or-teams', label: 'Wrong players or teams' },
    { key: 'incorrect-game-details', label: 'Incorrect game details' },
    { key: 'duplicate-game', label: 'Duplicate game' },
  ],
  [ReportEntityType.Score]: [
    { key: 'invalid-score', label: 'Invalid score' },
    { key: 'incorrect-score-value', label: 'Incorrect score value' },
    { key: 'wrong-player', label: 'Wrong player' },
    { key: 'wrong-team', label: 'Wrong team' },
    { key: 'wrong-mods', label: 'Wrong mods' },
    { key: 'missing-score', label: 'Missing score' },
    { key: 'duplicate-score', label: 'Duplicate score' },
  ],
} as const satisfies Record<ReportEntityType, readonly ReportReason[]>;

export const getReportReasons = (
  entityType: ReportEntityType
): readonly ReportReason[] => [
  ...ENTITY_REPORT_REASONS[entityType],
  SOMETHING_ELSE_REPORT_REASON,
];

export const getReportReason = (
  entityType: ReportEntityType,
  reasonKey: string | null | undefined
): ReportReason | undefined =>
  getReportReasons(entityType).find((reason) => reason.key === reasonKey);

export const isReportReasonKeyValid = (
  entityType: ReportEntityType,
  reasonKey: string
): boolean => getReportReason(entityType, reasonKey) !== undefined;

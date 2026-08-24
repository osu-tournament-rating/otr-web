import { AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enum-helpers';
import type {
  IEnumHelper,
  IBitwiseEnumHelper,
  EnumMetadata,
} from '@/lib/enum-helpers';
import {
  VerificationStatusEnumHelper,
  TournamentRejectionReasonEnumHelper,
  MatchRejectionReasonEnumHelper,
  GameRejectionReasonEnumHelper,
  ScoreRejectionReasonEnumHelper,
  MatchWarningFlagsEnumHelper,
  GameWarningFlagsEnumHelper,
  RulesetEnumHelper,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
  TeamEnumHelper,
  ScoreGradeEnumHelper,
  DataFetchStatusEnumHelper,
} from '@/lib/enum-helpers';

type AnyEnumHelper =
  IEnumHelper<number, EnumMetadata> | IBitwiseEnumHelper<number, EnumMetadata>;

type FieldConfig = {
  label: string;
  enumHelper?: AnyEnumHelper;
  isBitwise?: boolean;
  /** Rendered as a username. */
  isUserReference?: boolean;
};

export const auditFieldConfig: Record<
  AuditEntityType,
  Record<string, FieldConfig>
> = {
  [AuditEntityType.Tournament]: {
    name: { label: 'Name' },
    abbreviation: { label: 'Abbreviation' },
    forumUrl: { label: 'Forum URL' },
    rankRangeLowerBound: { label: 'Rank Range' },
    ruleset: { label: 'Ruleset', enumHelper: RulesetEnumHelper },
    lobbySize: { label: 'Lobby Size' },
    verificationStatus: {
      label: 'Verification Status',
      enumHelper: VerificationStatusEnumHelper,
    },
    rejectionReason: {
      label: 'Rejection Reason',
      enumHelper: TournamentRejectionReasonEnumHelper,
      isBitwise: true,
    },
    isLazer: { label: 'Lazer' },
    submittedByUserId: { label: 'Submitted By', isUserReference: true },
    verifiedByUserId: { label: 'Verified By', isUserReference: true },
    startTime: { label: 'Start Time' },
    endTime: { label: 'End Time' },
    created: { label: 'Created' },
  },
  [AuditEntityType.Match]: {
    osuId: { label: 'osu! ID' },
    name: { label: 'Name' },
    startTime: { label: 'Start Time' },
    endTime: { label: 'End Time' },
    verificationStatus: {
      label: 'Verification Status',
      enumHelper: VerificationStatusEnumHelper,
    },
    rejectionReason: {
      label: 'Rejection Reason',
      enumHelper: MatchRejectionReasonEnumHelper,
      isBitwise: true,
    },
    warningFlags: {
      label: 'Warning Flags',
      enumHelper: MatchWarningFlagsEnumHelper,
      isBitwise: true,
    },
    isLazer: { label: 'Lazer' },
    tournamentId: { label: 'Tournament ID' },
    submittedByUserId: { label: 'Submitted By', isUserReference: true },
    verifiedByUserId: { label: 'Verified By', isUserReference: true },
    created: { label: 'Created' },
    dataFetchStatus: {
      label: 'Data Fetch Status',
      enumHelper: DataFetchStatusEnumHelper,
    },
  },
  [AuditEntityType.Game]: {
    osuId: { label: 'osu! ID' },
    ruleset: { label: 'Ruleset', enumHelper: RulesetEnumHelper },
    scoringType: { label: 'Scoring Type', enumHelper: ScoringTypeEnumHelper },
    teamType: { label: 'Team Type', enumHelper: TeamTypeEnumHelper },
    mods: { label: 'Mods' },
    startTime: { label: 'Start Time' },
    endTime: { label: 'End Time' },
    verificationStatus: {
      label: 'Verification Status',
      enumHelper: VerificationStatusEnumHelper,
    },
    rejectionReason: {
      label: 'Rejection Reason',
      enumHelper: GameRejectionReasonEnumHelper,
      isBitwise: true,
    },
    warningFlags: {
      label: 'Warning Flags',
      enumHelper: GameWarningFlagsEnumHelper,
      isBitwise: true,
    },
    matchId: { label: 'Match ID' },
    beatmapId: { label: 'Beatmap ID' },
    created: { label: 'Created' },
  },
  [AuditEntityType.Score]: {
    score: { label: 'Score' },
    placement: { label: 'Placement' },
    accuracy: { label: 'Accuracy' },
    pp: { label: 'Performance Points' },
    maxCombo: { label: 'Max Combo' },
    pass: { label: 'Pass' },
    isPerfectCombo: { label: 'Perfect Combo' },
    legacyPerfect: { label: 'Legacy Perfect' },
    grade: { label: 'Grade', enumHelper: ScoreGradeEnumHelper },
    mods: { label: 'Mods' },
    statComboBreak: { label: 'Combo Breaks' },
    statGreat: { label: 'Great' },
    statOk: { label: 'Ok' },
    statMeh: { label: 'Meh' },
    statMiss: { label: 'Miss' },
    statGood: { label: 'Good' },
    statPerfect: { label: 'Perfect' },
    statSliderTailHit: { label: 'Slider Tail Hit' },
    statLargeTickHit: { label: 'Large Tick Hit' },
    statLargeTickMiss: { label: 'Large Tick Miss' },
    statSmallTickHit: { label: 'Small Tick Hit' },
    statSmallTickMiss: { label: 'Small Tick Miss' },
    statLargeBonus: { label: 'Large Bonus' },
    statSmallBonus: { label: 'Small Bonus' },
    statIgnoreHit: { label: 'Ignored Hit' },
    statIgnoreMiss: { label: 'Ignored Miss' },
    statLegacyComboIncrease: { label: 'Legacy Combo Increase' },
    legacyTotalScore: { label: 'Legacy Total Score' },
    team: { label: 'Team', enumHelper: TeamEnumHelper },
    ruleset: { label: 'Ruleset', enumHelper: RulesetEnumHelper },
    verificationStatus: {
      label: 'Verification Status',
      enumHelper: VerificationStatusEnumHelper,
    },
    rejectionReason: {
      label: 'Rejection Reason',
      enumHelper: ScoreRejectionReasonEnumHelper,
      isBitwise: true,
    },
    gameId: { label: 'Game ID' },
    playerId: { label: 'Player ID' },
    created: { label: 'Created' },
  },
  [AuditEntityType.Beatmap]: {
    osuId: { label: 'osu! ID' },
    diffName: { label: 'Difficulty' },
    ruleset: { label: 'Ruleset', enumHelper: RulesetEnumHelper },
    rankedStatus: { label: 'Ranked Status' },
    totalLength: { label: 'Total Length' },
    drainLength: { label: 'Drain Length' },
    bpm: { label: 'BPM' },
    countCircle: { label: 'Circles' },
    countSlider: { label: 'Sliders' },
    countSpinner: { label: 'Spinners' },
    cs: { label: 'CS' },
    hp: { label: 'HP' },
    od: { label: 'OD' },
    ar: { label: 'AR' },
    sr: { label: 'Star Rating' },
    maxCombo: { label: 'Max Combo' },
    beatmapsetId: { label: 'Beatmapset ID' },
    dataFetchStatus: {
      label: 'Data Fetch Status',
      enumHelper: DataFetchStatusEnumHelper,
    },
    manualOverride: { label: 'Manually Configured' },
    titleOverride: { label: 'Title Override' },
    artistOverride: { label: 'Artist Override' },
    setOwnerIdOverride: { label: 'Set Owner Override' },
    creators: { label: 'Creators' },
    created: { label: 'Created' },
  },
};

export function getTrackedFields(entityType: AuditEntityType): string[] {
  return Object.keys(auditFieldConfig[entityType]);
}

export function getFieldLabel(
  entityType: AuditEntityType,
  fieldName: string
): string {
  return auditFieldConfig[entityType]?.[fieldName]?.label ?? fieldName;
}

export function getFieldEnumHelper(
  entityType: AuditEntityType,
  fieldName: string
): AnyEnumHelper | undefined {
  return auditFieldConfig[entityType]?.[fieldName]?.enumHelper;
}

export function isFieldBitwise(
  entityType: AuditEntityType,
  fieldName: string
): boolean {
  return auditFieldConfig[entityType]?.[fieldName]?.isBitwise ?? false;
}

export function isFieldUserReference(
  entityType: AuditEntityType,
  fieldName: string
): boolean {
  return auditFieldConfig[entityType]?.[fieldName]?.isUserReference ?? false;
}

export type FieldOption = {
  label: string;
  value: string; // format: "entityType:fieldName"
  entityType: AuditEntityType;
  entityLabel: string;
};

const ENTITY_TYPES_FOR_FIELDS = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
  AuditEntityType.Beatmap,
] as const;

export function getFieldOptionsWithEntityType(): FieldOption[] {
  const options: FieldOption[] = [];
  for (const entityType of ENTITY_TYPES_FOR_FIELDS) {
    const entityLabel = AuditEntityTypeEnumHelper.getMetadata(entityType).text;
    for (const [fieldName, config] of Object.entries(
      auditFieldConfig[entityType]
    )) {
      options.push({
        label: config.label,
        value: `${entityType}:${fieldName}`,
        entityType,
        entityLabel,
      });
    }
  }
  return options;
}

export function parseFieldOptionValue(
  value: string
): { entityType: AuditEntityType; fieldName: string } | null {
  const [entityTypeStr, fieldName] = value.split(':');
  const entityType = Number(entityTypeStr) as AuditEntityType;
  if (isNaN(entityType) || !fieldName) return null;
  return { entityType, fieldName };
}

import { AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';
import type { IEnumHelper, IBitwiseEnumHelper, EnumMetadata } from '@/lib/enums';
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
} from '@/lib/enums';

type AnyEnumHelper =
  | IEnumHelper<number, EnumMetadata>
  | IBitwiseEnumHelper<number, EnumMetadata>;

type FieldConfig = {
  label: string;
  enumHelper?: AnyEnumHelper;
  isBitwise?: boolean;
};

/**
 * Map of entity type → field name → field display config.
 * Used for human-readable diff display and filter dropdowns.
 */
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
    submittedByUserId: { label: 'Submitted By' },
    verifiedByUserId: { label: 'Verified By' },
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
    tournamentId: { label: 'Tournament ID' },
    submittedByUserId: { label: 'Submitted By' },
    verifiedByUserId: { label: 'Verified By' },
    created: { label: 'Created' },
    dataFetchStatus: { label: 'Data Fetch Status', enumHelper: DataFetchStatusEnumHelper },
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
    playMode: { label: 'Play Mode' },
  },
  [AuditEntityType.Score]: {
    score: { label: 'Score' },
    placement: { label: 'Placement' },
    maxCombo: { label: 'Max Combo' },
    pass: { label: 'Pass' },
    grade: { label: 'Grade', enumHelper: ScoreGradeEnumHelper },
    mods: { label: 'Mods' },
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
};

/** Get list of tracked field names for an entity type */
export function getTrackedFields(entityType: AuditEntityType): string[] {
  return Object.keys(auditFieldConfig[entityType]);
}

/** Get tracked fields scoped to selected entity types */
export function getTrackedFieldsForTypes(
  entityTypes: AuditEntityType[]
): string[] {
  const fieldSet = new Set<string>();
  for (const entityType of entityTypes) {
    for (const field of getTrackedFields(entityType)) {
      fieldSet.add(field);
    }
  }
  return Array.from(fieldSet).sort();
}

/** Get field label for a specific entity type and field name */
export function getFieldLabel(
  entityType: AuditEntityType,
  fieldName: string
): string {
  return auditFieldConfig[entityType]?.[fieldName]?.label ?? fieldName;
}

/** Get the enum helper for a field, if it has one */
export function getFieldEnumHelper(
  entityType: AuditEntityType,
  fieldName: string
): AnyEnumHelper | undefined {
  return auditFieldConfig[entityType]?.[fieldName]?.enumHelper;
}

/** Check if a field uses bitwise enum values */
export function isFieldBitwise(
  entityType: AuditEntityType,
  fieldName: string
): boolean {
  return auditFieldConfig[entityType]?.[fieldName]?.isBitwise ?? false;
}

/** Field option for multi-select with entity context */
export type FieldOption = {
  label: string;
  value: string; // format: "entityType:fieldName"
  entityType: AuditEntityType;
  entityLabel: string; // "Tournament", "Match", etc.
};

const ENTITY_TYPES_FOR_FIELDS = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
] as const;

/** Get all field options with entity type context for multi-select */
export function getFieldOptionsWithEntityType(): FieldOption[] {
  const options: FieldOption[] = [];
  for (const entityType of ENTITY_TYPES_FOR_FIELDS) {
    const entityLabel = AuditEntityTypeEnumHelper.getMetadata(entityType).text;
    for (const [fieldName, config] of Object.entries(auditFieldConfig[entityType])) {
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

/** Parse field option value back to entity type and field name */
export function parseFieldOptionValue(value: string): { entityType: AuditEntityType; fieldName: string } | null {
  const [entityTypeStr, fieldName] = value.split(':');
  const entityType = Number(entityTypeStr) as AuditEntityType;
  if (isNaN(entityType) || !fieldName) return null;
  return { entityType, fieldName };
}

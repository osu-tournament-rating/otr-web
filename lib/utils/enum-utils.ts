import {
  Ruleset,
  VerificationStatus,
  TournamentProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import {
  RulesetEnumHelper,
  VerificationStatusEnumHelper,
  TournamentProcessingStatusEnumHelper,
} from '../enums';

export function isEqualRuleset(ruleset: Ruleset, value: string): boolean {
  return RulesetEnumHelper.getMetadata(ruleset).text === value;
}

export function isEqualVerificationStatus(
  verificationStatus: VerificationStatus,
  value: string
): boolean {
  return (
    VerificationStatusEnumHelper.getMetadata(verificationStatus).text === value
  );
}

export function isEqualTournamentProcessingStatus(
  processingStatus: TournamentProcessingStatus,
  value: string
): boolean {
  return (
    TournamentProcessingStatusEnumHelper.getMetadata(processingStatus).text ===
    value
  );
}

export function getRulesetFromText(text: string): Ruleset | undefined {
  const rulesetEntries = Object.entries(RulesetEnumHelper.metadata);
  const foundEntry = rulesetEntries.find(
    ([, metadata]) => metadata.text === text
  );

  return foundEntry ? (Number(foundEntry[0]) as Ruleset) : undefined;
}

export function getVerificationStatusFromText(
  text: string
): VerificationStatus | undefined {
  const verificationStatusEntries = Object.entries(
    VerificationStatusEnumHelper.metadata
  );
  const foundEntry = verificationStatusEntries.find(
    ([, metadata]) => metadata.text === text
  );
  return foundEntry ? (Number(foundEntry[0]) as VerificationStatus) : undefined;
}

export function getTournamentProcessingStatusFromText(
  text: string
): TournamentProcessingStatus | undefined {
  const tournamentProcessingStatusEntries = Object.entries(
    TournamentProcessingStatusEnumHelper.metadata
  );
  const foundEntry = tournamentProcessingStatusEntries.find(
    ([, metadata]) => metadata.text === text
  );
  return foundEntry
    ? (Number(foundEntry[0]) as TournamentProcessingStatus)
    : undefined;
}

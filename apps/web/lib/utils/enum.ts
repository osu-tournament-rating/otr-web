import { Ruleset, VerificationStatus } from '@otr/core/osu';
import { RulesetEnumHelper, VerificationStatusEnumHelper } from '../enums';

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

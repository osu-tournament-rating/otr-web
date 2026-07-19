import { Ruleset } from '@otr/core/osu';

import { RulesetEnumHelper } from '@/lib/enum-helpers';

export function getBeatmapDisplayRuleset(
  ruleset: Ruleset,
  difficultyName: string
): Ruleset {
  if (ruleset !== Ruleset.ManiaOther) return ruleset;

  if (/\b4K\b/i.test(difficultyName)) return Ruleset.Mania4k;
  if (/\b7K\b/i.test(difficultyName)) return Ruleset.Mania7k;

  return ruleset;
}

export function getBeatmapRulesetLabel(
  ruleset: Ruleset,
  difficultyName: string
): string {
  return RulesetEnumHelper.getMetadata(
    getBeatmapDisplayRuleset(ruleset, difficultyName)
  ).text;
}

export function isManiaRuleset(ruleset: Ruleset): boolean {
  return (
    ruleset === Ruleset.ManiaOther ||
    ruleset === Ruleset.Mania4k ||
    ruleset === Ruleset.Mania7k
  );
}

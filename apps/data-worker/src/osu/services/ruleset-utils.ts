import { Ruleset } from '@otr/core/osu/enums';

const isManiaVariant = (
  value: Ruleset
): value is Ruleset.Mania4k | Ruleset.Mania7k =>
  value === Ruleset.Mania4k || value === Ruleset.Mania7k;

export const resolveRulesetWithTournament = (
  rawRuleset: Ruleset,
  tournamentRuleset: Ruleset
): Ruleset => {
  if (rawRuleset === Ruleset.ManiaOther && isManiaVariant(tournamentRuleset)) {
    return tournamentRuleset;
  }

  return rawRuleset;
};

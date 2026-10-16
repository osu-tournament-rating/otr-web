import { eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';

const RULESET_ORDER = Object.values(Ruleset).filter(
  (value): value is Ruleset => typeof value === 'number'
);

/**
 * The rulesets a list request names. The single `ruleset` param predates
 * `rulesets`, so a request may send either or both, and a row matches any
 * ruleset either one names. Duplicates collapse and the order follows the enum.
 */
export function collectRulesets(
  ruleset: Ruleset | undefined,
  rulesets: readonly Ruleset[] | undefined
): Ruleset[] {
  const requested = new Set<Ruleset>(rulesets ?? []);

  if (ruleset !== undefined) {
    requested.add(ruleset);
  }

  return RULESET_ORDER.filter((value) => requested.has(value));
}

/** Tournaments in any of `rulesets`, or no condition when it is empty. */
export function buildTournamentRulesetCondition(
  rulesets: readonly Ruleset[]
): SQL | undefined {
  if (rulesets.length === 0) {
    return undefined;
  }

  return rulesets.length === 1
    ? eq(schema.tournaments.ruleset, rulesets[0]!)
    : inArray(schema.tournaments.ruleset, [...rulesets]);
}

/**
 * Beatmaps that display as any of `rulesets`. A mania 4K or 7K choice also
 * takes `ManiaOther` maps whose difficulty name says 4K or 7K, as
 * getBeatmapDisplayRuleset does; `\y` is Postgres's word boundary.
 */
export function buildBeatmapRulesetCondition(
  rulesets: readonly Ruleset[]
): SQL | undefined {
  const conditions = rulesets.map((ruleset) => {
    if (ruleset === Ruleset.Mania4k || ruleset === Ruleset.Mania7k) {
      const keyPattern = ruleset === Ruleset.Mania4k ? '4k' : '7k';
      return sql`(${schema.beatmaps.ruleset} = ${ruleset} OR (${schema.beatmaps.ruleset} = ${Ruleset.ManiaOther} AND ${schema.beatmaps.diffName} ~* ${`\\y${keyPattern}\\y`}))`;
    }

    return eq(schema.beatmaps.ruleset, ruleset);
  });

  return conditions.length <= 1 ? conditions[0] : or(...conditions);
}

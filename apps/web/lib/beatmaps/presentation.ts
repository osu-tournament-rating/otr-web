import { Ruleset } from '@otr/core/osu';

import { RulesetEnumHelper } from '@/lib/enum-helpers';

const difficultyColorBands = [
  { upperBound: 1.5, color: 'var(--difficulty-light-blue)' },
  { upperBound: 2.25, color: 'var(--difficulty-light-green)' },
  { upperBound: 3, color: 'var(--difficulty-green)' },
  { upperBound: 3.75, color: 'var(--difficulty-yellow)' },
  { upperBound: 4.5, color: 'var(--difficulty-orange)' },
  { upperBound: 5.25, color: 'var(--difficulty-red)' },
  { upperBound: 6, color: 'var(--difficulty-violet)' },
  { upperBound: 6.75, color: 'var(--difficulty-purple)' },
  { upperBound: 7.5, color: 'var(--difficulty-deep-blue)' },
  { upperBound: Number.POSITIVE_INFINITY, color: 'var(--difficulty-black)' },
] as const;

/**
 * Returns the pastel difficulty-spectrum color for an SR icon.
 *
 * The thresholds are centralized here so listing stars and beatmapset ruleset
 * icons always communicate difficulty with the same visual scale.
 */
export function getDifficultyColor(starRating: number): string {
  const normalizedRating =
    Number.isFinite(starRating) && starRating > 0 ? starRating : 0;

  return (
    difficultyColorBands.find(({ upperBound }) => normalizedRating < upperBound)
      ?.color ?? difficultyColorBands[difficultyColorBands.length - 1].color
  );
}

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

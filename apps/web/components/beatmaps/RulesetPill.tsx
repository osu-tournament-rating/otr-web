import type { Ruleset } from '@otr/core/osu';

import {
  beatmapPillVariants,
  type BeatmapPillVariants,
} from '@/components/beatmaps/pill';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Badge } from '@/components/ui/badge';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
} from '@/lib/beatmaps/presentation';
import { cn } from '@/lib/utils';

interface RulesetPillProps extends BeatmapPillVariants {
  ruleset: Ruleset;
  /** Resolves keyed mania variants that only the difficulty name reveals. */
  diffName: string;
  className?: string;
  testId?: string;
}

/** Names the game mode a beatmap is played in. Pairs with `StarRatingPill`. */
export default function RulesetPill({
  ruleset,
  diffName,
  size,
  tone,
  className,
  testId = 'beatmap-ruleset',
}: RulesetPillProps) {
  const displayRuleset = getBeatmapDisplayRuleset(ruleset, diffName);
  const label = getBeatmapRulesetLabel(ruleset, diffName);

  return (
    <Badge
      data-testid={testId}
      className={cn(beatmapPillVariants({ size, tone }), className)}
    >
      <RulesetIcon
        ruleset={displayRuleset}
        className="fill-current"
        aria-hidden="true"
      />
      <span data-testid={testId ? `${testId}-value` : undefined}>{label}</span>
    </Badge>
  );
}

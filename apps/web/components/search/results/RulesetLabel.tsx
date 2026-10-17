import type { Ruleset } from '@otr/core/osu';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { getRulesetLabel } from '@/lib/kit/format/ruleset';

/**
 * A result row's ruleset: the muted icon, with its short name from phone
 * width up (screen readers always hear it). A row opens as a whole, so the
 * name is written out instead of sitting in a tooltip button.
 */
export function RulesetLabel({ ruleset }: { ruleset: Ruleset }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground">
      <RulesetIcon
        ruleset={ruleset}
        aria-hidden="true"
        className="size-4 shrink-0 fill-muted-foreground"
      />
      <span className="sr-only sm:not-sr-only">{getRulesetLabel(ruleset)}</span>
    </span>
  );
}

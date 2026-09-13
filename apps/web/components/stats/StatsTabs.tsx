import { Trophy, Users } from 'lucide-react';
import Link from 'next/link';

import { RulesetButton } from '@/components/buttons/RulesetButton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlayerStatsRulesetValue } from '@/lib/orpc/schema/stats';
import { STATS_RULESETS, statsHref, type StatsTab } from '@/lib/stats/params';
import { cn } from '@/lib/utils';

/** Tab row for `/stats`, with the ruleset selector in a slot of its own. */
export default function StatsTabs({
  tab,
  ruleset,
}: {
  tab: StatsTab;
  ruleset: PlayerStatsRulesetValue;
}) {
  const rulesetHidden = tab !== 'players';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={tab} className="w-full sm:w-auto">
        <TabsList data-testid="stats-tabs" className="w-full sm:w-fit">
          <TabsTrigger value="tournaments" asChild>
            <Link
              href={statsHref('tournaments', ruleset)}
              data-testid="stats-tab-tournaments"
            >
              <Trophy aria-hidden />
              Tournaments
            </Link>
          </TabsTrigger>
          <TabsTrigger value="players" asChild>
            <Link
              href={statsHref('players', ruleset)}
              data-testid="stats-tab-players"
            >
              <Users aria-hidden />
              Players
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Fixed slot on both tabs, so nothing below it shifts between them */}
      <div
        className={cn(
          'flex h-12 w-54 shrink-0 items-center gap-1',
          rulesetHidden && 'invisible'
        )}
        inert={rulesetHidden}
      >
        {STATS_RULESETS.map((option) => (
          <RulesetButton
            key={option}
            ruleset={option}
            isSelected={option === ruleset}
            href={statsHref(tab, option)}
          />
        ))}
      </div>
    </div>
  );
}

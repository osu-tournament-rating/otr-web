'use client';

import { Ruleset } from '@otr/core/osu';
import { PlatformStats } from '@/lib/orpc/schema/stats';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import RulesetIcon from '../icons/RulesetIcon';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import RatingDistributionChart from './RatingDistributionChart';

interface RatingDistributionTabsProps {
  ratingsByRuleset: PlatformStats['ratingStats']['ratingsByRuleset'];
  userRatings: Record<number, number>;
}

export default function RatingDistributionTabs({
  ratingsByRuleset,
  userRatings,
}: RatingDistributionTabsProps) {
  const rulesets = Object.entries(ratingsByRuleset)
    .map(([key, ratings]) => ({ ruleset: parseInt(key, 10), ratings }))
    .filter(
      (entry): entry is { ruleset: Ruleset; ratings: Record<string, number> } =>
        entry.ratings !== undefined && entry.ruleset !== Ruleset.ManiaOther
    )
    .sort((a, b) => a.ruleset - b.ruleset);

  if (rulesets.length === 0) {
    return null;
  }

  const defaultRuleset = rulesets.some((r) => r.ruleset === Ruleset.Osu)
    ? Ruleset.Osu
    : rulesets[0].ruleset;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RulesetIcon ruleset="all" className="h-6 w-6 fill-primary" />
          Rating Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={String(defaultRuleset)}>
          <TabsList className="w-full">
            {rulesets.map(({ ruleset }) => (
              <TabsTrigger
                key={ruleset}
                value={String(ruleset)}
                className="min-w-0"
              >
                <RulesetIcon
                  ruleset={ruleset}
                  className="h-4 w-4 shrink-0 fill-current"
                />
                <span className="hidden truncate sm:inline">
                  {RulesetEnumHelper.getMetadata(ruleset)?.text}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {rulesets.map(({ ruleset, ratings }) => (
            <TabsContent key={ruleset} value={String(ruleset)} className="pt-4">
              <RatingDistributionChart
                ruleset={ruleset}
                ratings={ratings}
                userRating={userRatings[ruleset]}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

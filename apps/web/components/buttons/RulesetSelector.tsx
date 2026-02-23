'use client';

import { Ruleset } from '@otr/core/osu';
import { RulesetButton } from './RulesetButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { RulesetEnumHelper } from '@/lib/enum-helpers';

export default function PlayerRulesetSelector({
  defaultRuleset,
}: {
  defaultRuleset: Ruleset;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL
  // fallback to defaultRuleset or Osu
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset>(
    Number(
      searchParams.get('ruleset') || defaultRuleset || Ruleset.Osu
    ) as Ruleset
  );

  // Sync state with URL changes (e.g. when navigating from search results)
  useEffect(() => {
    const rulesetFromUrl = Number(
      searchParams.get('ruleset') || defaultRuleset || Ruleset.Osu
    ) as Ruleset;
    setSelectedRuleset(rulesetFromUrl);
  }, [searchParams, defaultRuleset]);

  const handleRulesetChange = (ruleset: Ruleset) => {
    setSelectedRuleset(ruleset);

    // Update URL with new ruleset
    const params = new URLSearchParams(searchParams.toString());
    params.set('ruleset', ruleset.toString());

    // Preserve other params like dateMin and dateMax
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="fill-primary flex items-center gap-1 rounded p-1">
      {Object.entries(RulesetEnumHelper.metadata)
        .map(([rulesetKey]) => {
          const ruleset = Number(rulesetKey) as Ruleset;
          if (ruleset === Ruleset.ManiaOther) {
            return null;
          }

          return (
            <RulesetButton
              key={`ruleset-${rulesetKey}`}
              ruleset={ruleset}
              isSelected={selectedRuleset === ruleset}
              onClick={() => handleRulesetChange(ruleset)}
            />
          );
        })
        .filter(Boolean)}
    </div>
  );
}

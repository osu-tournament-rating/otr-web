'use client';

import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { RulesetButton } from './RulesetButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { RulesetEnumHelper } from '@/lib/enums';

export default function PlayerRulesetSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL or default to Osu
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset>(
    Number(searchParams.get('ruleset') || Ruleset.Osu) as Ruleset
  );

  const handleRulesetChange = (ruleset: Ruleset) => {
    setSelectedRuleset(ruleset);

    // Update URL with new ruleset
    const params = new URLSearchParams(searchParams.toString());
    params.set('ruleset', ruleset.toString());

    // Preserve other params like dateMin and dateMax
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-1 rounded fill-primary p-1">
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

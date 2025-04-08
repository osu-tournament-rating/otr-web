'use client';

import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { RulesetButton } from './RulesetButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

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
    <div className="flex items-center gap-1 rounded-full bg-muted/50 fill-primary p-1">
      <RulesetButton
        ruleset={Ruleset.Osu}
        isSelected={selectedRuleset === Ruleset.Osu}
        onClick={() => handleRulesetChange(Ruleset.Osu)}
      />
      <RulesetButton
        ruleset={Ruleset.Taiko}
        isSelected={selectedRuleset === Ruleset.Taiko}
        onClick={() => handleRulesetChange(Ruleset.Taiko)}
      />
      <RulesetButton
        ruleset={Ruleset.Catch}
        isSelected={selectedRuleset === Ruleset.Catch}
        onClick={() => handleRulesetChange(Ruleset.Catch)}
      />
      <RulesetButton
        ruleset={Ruleset.Mania4k}
        isSelected={selectedRuleset === Ruleset.Mania4k}
        onClick={() => handleRulesetChange(Ruleset.Mania4k)}
      />
      <RulesetButton
        ruleset={Ruleset.Mania7k}
        isSelected={selectedRuleset === Ruleset.Mania7k}
        onClick={() => handleRulesetChange(Ruleset.Mania7k)}
      />
    </div>
  );
}

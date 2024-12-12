'use client';

import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { useState } from 'react';
import styles from './RulesetSwitcher.module.css';
import { RulesetMetadata } from '@/lib/enums';
import { useUser } from '@/util/hooks';
import clsx from 'clsx';

export default function RulesetSelector() {
  const { user } = useUser();
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset | undefined>(user?.settings?.ruleset);

  const selectRuleset = (value: string) => {

  }

  const isSelected = (value: string) => {
    if (!selectedRuleset) {
      return value === 'All';
    }

    return (value as any as Ruleset) === selectedRuleset;
  }

  return (
    <div className={styles.rulesetSwitcher}>
      {Object.entries(RulesetMetadata).map(([value, { image: Icon, shortAlt, displayInSelector }]) => {
        if (displayInSelector) {
          return (
            <button
              key={value}
              className={clsx(
                styles.switchButton,
                isSelected(value) && styles.active,
              )}>
              <Icon className={'fill'} />
            </button>
          );
        }
      })}
    </div>
  );
}

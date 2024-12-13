'use client';

import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { useState } from 'react';
import styles from './RulesetSwitcher.module.css';
import { RulesetMetadata } from '@/lib/enums';
import { useUser } from '@/util/hooks';
import clsx from 'clsx';
import { Tooltip } from 'react-tooltip';

export default function RulesetSelector() {
  const { user } = useUser();
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset | undefined>(user?.settings?.ruleset);

  const isSelected = (value: string) => {
    if (selectedRuleset === undefined) {
      return value === 'All';
    }
    return (parseInt(value) as Ruleset) === selectedRuleset;
  }

  const handleClick = (value: string) => {
    return value === 'All'
      ? setSelectedRuleset(undefined)
      : setSelectedRuleset(parseInt(value) as Ruleset);
  }

  return (
    <div className={styles.rulesetSwitcher}>
      {Object.entries(RulesetMetadata)
        .filter(([_, { displayInSelector }]) => displayInSelector)
        // TODO: Couldn't figure out sorting by index? All rulesets button should probably always be first
        // .sort(([_vA, { selectorIndex: idxA }], [_vB, { selectorIndex: idxB }]) => idxA! - idxB!)
        .map(([value, { image: Icon, shortAlt }]) => {
          return (
            <button
              key={value}
              className={clsx(
                styles.switchButton,
                isSelected(value) && styles.active,
              )}
              data-tooltip-id={'ruleset-selector-tooltip'}
              data-tooltip-content={shortAlt}
              onClick={() => handleClick(value)}
            >
              <Icon className={'fill'} />
            </button>
          );
        })
      }
      <Tooltip id={'ruleset-selector-tooltip'} delayShow={300} />
    </div>
  );
}

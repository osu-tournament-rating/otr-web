'use client';

import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { useState } from 'react';
import styles from './RulesetSelector.module.css';
import { RulesetMetadata } from '@/lib/enums';
import clsx from 'clsx';
import { Tooltip } from 'react-tooltip';

export default function RulesetSelector({
  initialRuleset,
  onChange,
}: {
  /** Initial ruleset for the selector */
  initialRuleset?: Ruleset;
  /**
   * Callback fired when selected value changes
   * Value undefined when 'All Rulesets' selected
   */
  onChange?: (value: Ruleset | undefined) => void;
}) {
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset | undefined>(
    initialRuleset
  );

  const isSelected = (value: string) => {
    if (selectedRuleset === undefined) {
      return value === 'All';
    }
    return (parseInt(value) as Ruleset) === selectedRuleset;
  };

  const handleClick = (value: string) => {
    if (isSelected(value)) {
      return;
    }

    const newValue = value === 'All' ? undefined : (parseInt(value) as Ruleset);

    setSelectedRuleset(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

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
                isSelected(value) && styles.active
              )}
              data-tooltip-id={'ruleset-selector-tooltip'}
              data-tooltip-content={shortAlt}
              onClick={() => handleClick(value)}
            >
              <Icon className={'fill'} />
            </button>
          );
        })}
      <Tooltip id={'ruleset-selector-tooltip'} delayShow={300} />
    </div>
  );
}

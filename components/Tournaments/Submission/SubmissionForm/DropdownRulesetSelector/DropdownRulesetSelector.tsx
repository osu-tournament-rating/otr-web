'use client';

import { useState } from 'react';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { useClickAway } from '@uidotdev/usehooks';
import { useAdminViewContext } from '@/components/Context/AdminViewContext/AdminViewContext';
import styles from './DropdownRulesetSelector.module.css';
import { RulesetMetadata } from '@/lib/enums';

type DropdownOptionTextFormat = 'full' | 'short';

export default function DropdownRulesetSelector({
  value = Ruleset.Osu,
  textFormat = 'full',
  onSelect,
}: {
  /** Initial value for the selector. Defaults to {@link Ruleset.Osu} */
  value?: Ruleset;
  /** Text format for list items. Defaults to 'full' */
  textFormat?: DropdownOptionTextFormat;
  /** Callback fired when a value is selected */
  onSelect?: (value: Ruleset | undefined) => void | Promise<void>;
}) {
  const { isAdminView } = useAdminViewContext();

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Ruleset>(value);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const dropdownRef = useClickAway<HTMLDivElement>(() => {
    if (isOpen) {
      toggleDropdown();
    }
  });

  const handleSelect = async (value: Ruleset) => {
    try {
      if (onSelect) {
        await onSelect(value);
        setSelected(value);
      } else {
        setSelected(value);
      }
    } catch (e) {
      // TODO: Error toast
      console.log(e);
    } finally {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.dropdownContainer}>
      <button className={styles.dropdownSelected} onClick={toggleDropdown}>
        {getSelectorOptionNodes({ ruleset: selected, textFormat })}
      </button>
      {isOpen && (
        <ul className={styles.dropdownOptionsContainer} role={'listbox'}>
          {Object.entries(RulesetMetadata)
            .filter(
              ([r, { displayInSelector }]) =>
                // Type hack because enums suck
                (r as any as Ruleset) !== selected &&
                (displayInSelector || isAdminView)
            )
            .map(([r]) => {
              const ruleset = r as any as Ruleset;
              return (
                <li
                  className={styles.dropdownOption}
                  key={ruleset}
                  role={'option'}
                  aria-selected={ruleset === selected}
                  onClick={() => handleSelect(ruleset)}
                >
                  {getSelectorOptionNodes({ ruleset, textFormat })}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

function getSelectorOptionNodes({
  ruleset,
  textFormat,
}: {
  ruleset: Ruleset;
  textFormat: DropdownOptionTextFormat;
}) {
  const { alt, shortAlt, image: Icon } = RulesetMetadata[ruleset];
  const text = textFormat === 'full' ? alt : shortAlt;

  return (
    <>
      <Icon className={'fill'} />
      {text}
    </>
  );
}

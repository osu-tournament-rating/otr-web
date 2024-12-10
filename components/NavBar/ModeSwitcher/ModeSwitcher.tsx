'use client';

import { setCookieValue } from '@/app/actions/session';
import { CookieNames } from '@/lib/types';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import { useState } from 'react';
import styles from './ModeSwitcher.module.css';

import { RulesetMetadata } from '@/lib/enums';

export default function ModeSwitcher({ ruleset }: { ruleset: Ruleset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset>(ruleset);
  const selectedRulesetIcon = RulesetMetadata[selectedRuleset];

  return (
    <div className={styles.modeSwitcher}>
      <button
        className={styles.switchButton}
        onClick={(e) => {
          e.preventDefault();
          return setIsOpen((prev) => !prev);
        }}
      >
        <Image
          src={selectedRulesetIcon.imageUrl}
          alt={selectedRulesetIcon.alt}
          fill
        />
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={styles.item}
            onClick={async () => {
              setSelectedRuleset(Ruleset.Osu);
              setIsOpen(false);
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.Osu);
            }}
          >
            osu!
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedRuleset(Ruleset.ManiaOther);
              setIsOpen(false);
              return setCookieValue(
                CookieNames.SelectedRuleset,
                Ruleset.ManiaOther
              );
            }}
          >
            osu!Mania
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedRuleset(Ruleset.Taiko);
              setIsOpen(false);
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.Taiko);
            }}
          >
            osu!Taiko
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedRuleset(Ruleset.Catch);
              setIsOpen(false);
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.Catch);
            }}
          >
            osu!Catch
          </button>
        </div>
      )}
    </div>
  );
}

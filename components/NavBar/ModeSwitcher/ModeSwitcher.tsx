'use client';

import ctbSVG from '@/public/icons/ctb.svg?url';
import maniaSVG from '@/public/icons/mania.svg?url';
import standardSVG from '@/public/icons/osu.svg?url';
import taikoSVG from '@/public/icons/taiko.svg?url';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import { useState } from 'react';
import styles from './ModeSwitcher.module.css';
import { setCookieValue } from '@/app/actions/session';
import { CookieNames } from '@/lib/types';

function getRulesetIcon(ruleset: Ruleset): { image: any, alt: string } {
  switch(ruleset) {
    case Ruleset.Taiko: return { image: taikoSVG, alt: 'osu!Taiko' };
    case Ruleset.Catch: return { image: ctbSVG, alt: 'osu!Catch' };
    case Ruleset.ManiaOther: return { image: maniaSVG, alt: 'osu!Mania' };
    default: return { image: standardSVG, alt: 'osu!' };
  }
}

export default function ModeSwitcher({ ruleset }: { ruleset: Ruleset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset>(ruleset);

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
          src={getRulesetIcon(selectedRuleset).image}
          alt={getRulesetIcon(selectedRuleset).alt}
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
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.Osu.toString());
            }}
          >
            osu!
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedRuleset(Ruleset.ManiaOther);
              setIsOpen(false);
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.ManiaOther.toString());
            }}
          >
            osu!Mania
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedRuleset(Ruleset.Taiko);
              setIsOpen(false);
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.Taiko.toString());
            }}
          >
            osu!Taiko
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedRuleset(Ruleset.Catch);
              setIsOpen(false);
              return setCookieValue(CookieNames.SelectedRuleset, Ruleset.Catch.toString());
            }}
          >
            osu!Catch
          </button>
        </div>
      )}
    </div>
  );
}

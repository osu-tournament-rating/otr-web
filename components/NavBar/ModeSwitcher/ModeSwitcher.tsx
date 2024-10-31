'use client';

import ctbSVG from '@/public/icons/ctb.svg?url';
import maniaSVG from '@/public/icons/mania.svg?url';
import standardSVG from '@/public/icons/osu.svg?url';
import taikoSVG from '@/public/icons/taiko.svg?url';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import { useState } from 'react';
import styles from './ModeSwitcher.module.css';
import { setCookie } from '@/app/actions/session';

const modeIcons: { [key: string]: { image: any; alt: string } } = {
  '0': {
    image: standardSVG,
    alt: 'Standard',
  },
  '1': {
    image: taikoSVG,
    alt: 'Taiko',
  },
  '2': {
    image: ctbSVG,
    alt: 'CTB',
  },
  '3': {
    image: maniaSVG,
    alt: 'Mania',
  },
};

export default function ModeSwitcher({ mode }: { mode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(mode ?? Ruleset.Osu.toString());

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
          src={modeIcons[`${selectedMode}`].image}
          alt={modeIcons[`${selectedMode}`].alt}
          fill
        />
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={styles.item}
            onClick={async () => {
              setSelectedMode(Ruleset.Osu.toString());
              setIsOpen(false);
              return setCookie('OTR-user-selected-osu-mode', Ruleset.Osu.toString());
            }}
          >
            osu!
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedMode(Ruleset.ManiaOther.toString());
              setIsOpen(false);
              return setCookie('OTR-user-selected-osu-mode', Ruleset.ManiaOther.toString());
            }}
          >
            osu!Mania
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedMode(Ruleset.Taiko.toString());
              setIsOpen(false);
              return setCookie('OTR-user-selected-osu-mode', Ruleset.Taiko.toString());
            }}
          >
            osu!Taiko
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedMode(Ruleset.Catch.toString());
              setIsOpen(false);
              return setCookie('OTR-user-selected-osu-mode', Ruleset.Catch.toString());
            }}
          >
            osu!Catch
          </button>
        </div>
      )}
    </div>
  );
}

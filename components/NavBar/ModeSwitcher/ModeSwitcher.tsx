'use client';
import { changeOsuModeCookie } from '@/app/actions';
import ctbSVG from '@/public/icons/ctb.svg';
import maniaSVG from '@/public/icons/mania.svg';
import standardSVG from '@/public/icons/osu.svg';
import taikoSVG from '@/public/icons/taiko.svg';
import Image from 'next/image';
import { useState } from 'react';
import styles from './ModeSwitcher.module.css';

export default function ModeSwitcher({ mode }: { mode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(mode ?? '0');

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
          src={modeIcons[`${mode}`].image}
          alt={modeIcons[`${mode}`].alt}
          fill
        />
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={styles.item}
            onClick={async () => {
              setSelectedMode('0');
              setIsOpen(false);
              return await changeOsuModeCookie('0');
            }}
          >
            osu!
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedMode('3');
              setIsOpen(false);
              return changeOsuModeCookie('3');
            }}
          >
            osu!Mania
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedMode('1');
              setIsOpen(false);
              return changeOsuModeCookie('1');
            }}
          >
            osu!Taiko
          </button>
          <button
            className={styles.item}
            onClick={() => {
              setSelectedMode('2');
              setIsOpen(false);
              return changeOsuModeCookie('2');
            }}
          >
            osu!Catch
          </button>
        </div>
      )}
    </div>
  );
}

'use client';
import MoonIcon from '@/public/icons/moon.svg';
import SunIcon from '@/public/icons/sun.svg';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useHotkeys } from 'react-hotkeys-hook';
import styles from './ThemeSwitcher.module.css';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  useHotkeys('ctrl+l', (e) => {
    e.preventDefault();
    setTheme(theme === 'light' ? 'dark' : 'light');
  });

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      <div className={styles.themeSwitcher}>
        {theme === 'light' && <SunIcon />}
        {theme === 'dark' && <MoonIcon />}
        {!theme && <></>}
      </div>
    </button>
  );
}

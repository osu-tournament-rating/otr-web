'use client';

import MoonIcon from '@/public/icons/moon.svg';
import SunIcon from '@/public/icons/sun.svg';
import styles from './ThemeSwitcher.module.css';
import { useTheme } from 'next-themes';
import { useHotkeys } from 'react-hotkeys-hook';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  useHotkeys('ctrl+l', (e) => {
    e.preventDefault();
    toggleTheme();
  });

  return (
    <button onClick={toggleTheme}>
      <div className={styles.themeSwitcher}>
        {theme === 'light' ? <SunIcon /> : <MoonIcon />}
      </div>
    </button>
  );
}

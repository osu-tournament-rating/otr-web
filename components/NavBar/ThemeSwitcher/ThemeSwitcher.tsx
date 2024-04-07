'use client';
import moonSVG from '@/public/icons/moon.svg';
import sunSVG from '@/public/icons/sun.svg';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import styles from './ThemeSwitcher.module.css';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      <div className={styles.themeSwitcher}>
        <Image
          src={theme === 'light' ? sunSVG : moonSVG}
          alt="Theme Switcher"
          fill
        />
      </div>
    </button>
  );
}

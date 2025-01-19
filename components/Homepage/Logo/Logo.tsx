'use client';
import fullLogoDark from '@/public/logos/full-logo-dark.svg?url';
import fullLogo from '@/public/logos/full-logo.svg?url';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './Logo.module.css';

export default function Logo() {
  const { theme } = useTheme();
  const [activeTheme, setTheme] = useState('light');

  useEffect(() => {
    if (theme) {
      setTheme(theme);
    }
  }, [theme]);

  return (
    <div className={styles.logo}>
      <Image
        src={
          activeTheme === 'dark'
            ? fullLogoDark
            : activeTheme === 'light'
              ? fullLogo
              : ''
        }
        alt={'o!TR logo'}
        fill
      />
    </div>
  );
}

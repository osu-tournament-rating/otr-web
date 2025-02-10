'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import styles from './Logo.module.css';
import { useEffect, useState } from 'react';

const logoLight = '/logos/full-logo.svg';
const logoDark = '/logos/full-logo-dark.svg';

export default function Logo() {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={styles.logo}>
      <Image
        src={theme === 'dark' ? logoDark : logoLight}
        alt={'o!TR logo'}
        fill
      />
    </div>
  );
}

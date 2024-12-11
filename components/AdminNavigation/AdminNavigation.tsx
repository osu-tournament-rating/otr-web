'use client';

import styles from './AdminNavigation.module.css';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import clsx from 'clsx';
import CupIcon from '@/public/icons/Cup.svg';
import PlayerIcon from '@/public/icons/User.svg';
import PlaceholderLandingIcon from '@/public/logos/small.svg';

const NavCell = ({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const pathName = usePathname();

  return (
    <Link
      className={clsx(
        styles.navCell,
        pathName === href ? styles.active : ''
      )}
      href={href}
    >
      {children}
    </Link>
  )
}

export default function AdminNavigation() {
  return (
    <div className={styles.navigation}>
      <NavCell href={'/admin'}>
        <PlaceholderLandingIcon className={'fill'}/>
      </NavCell>
      <NavCell href={'/admin/tournaments'}>
        <CupIcon className={'fill'} />
      </NavCell>
      <NavCell href={'/admin/players'}>
        <PlayerIcon className={'fill'} />
      </NavCell>
    </div>
  );
}
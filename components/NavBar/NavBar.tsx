'use client';

import { getCookie } from '@/app/actions/session';
import Logo from '@/public/logos/small.svg';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import HamburgerMobile from './HamburgerMobile/HamburgerMobile';
import ModeSwitcher from './ModeSwitcher/ModeSwitcher';
import styles from './NavBar.module.css';
import Routes from './Routes/Routes';
import SearchButton from './SearchButton/SearchButton';
import UserLogged from './UserLogged/UserLogged';

export default function NavBar() {
  const [cookieMode, setCookieMode] = useState({});

  useEffect(() => {
    setCookieMode(getCookie('OTR-user-selected-osu-mode') ?? Ruleset.Osu);
  }, []);

  return (
    <nav className={styles.navbar}>
      <Link href={'/'} className={styles.logoLink}>
        <Logo />
      </Link>
      <div className={styles.content}>
        <Routes />
        {/* <Link href={'/donate'}>Donate</Link> */}
        <div className={styles.actions}>
          <SearchButton />
          {cookieMode && <ModeSwitcher mode={cookieMode as string} />}
          <UserLogged />
        </div>
      </div>
      {/* Hamburger Menu Icon for mobile */}
      <HamburgerMobile />
    </nav>
  );
}

'use client';

import { getCookieValue } from '@/app/actions/session';
import { CookieNames } from '@/lib/types';
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
  const [rulesetState, setRulesetState] = useState<Ruleset>(Ruleset.Osu);

  useEffect(() => {
    getCookieValue(CookieNames.UserSelectedRuleset).then((value) => {
      if (value) {
        setRulesetState(Ruleset[value as keyof typeof Ruleset]);
      }
    });
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
          {rulesetState && <ModeSwitcher ruleset={rulesetState} />}
          <UserLogged />
        </div>
      </div>
      {/* Hamburger Menu Icon for mobile */}
      <HamburgerMobile />
    </nav>
  );
}

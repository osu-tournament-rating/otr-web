'use client';

import { getOsuModeCookie } from '@/app/actions';
import moonSVG from '@/public/icons/moon.svg';
import logo from '@/public/logos/small.svg';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import HamburgerMobile from './HamburgerMobile/HamburgerMobile';
import ModeSwitcher from './ModeSwitcher/ModeSwitcher';
import styles from './NavBar.module.css';
import Routes from './Routes/Routes';
import UserLogged from './UserLogged/UserLogged';

export default function NavBar() {
  const [cookieMode, setCookieMode] = useState({});

  useEffect(() => {
    const cookie = Promise.resolve(getOsuModeCookie());
    cookie.then((value) => {
      setCookieMode(value);
    });
  }, []);

  return (
    <nav className={styles.navbar}>
      <Link href={'/'} className={styles.logoLink}>
        <Image src={logo} alt="o!TR" fill />
      </Link>
      <div className={styles.content}>
        <Routes />
        {/* <Link href={'/donate'}>Donate</Link> */}
        <div className={styles.actions}>
          {cookieMode?.value && <ModeSwitcher mode={cookieMode?.value} />}
          <button>
            <div className={styles.darkModeSwitcher}>
              <Image src={moonSVG} alt="Dark Mode Switcher" fill />
            </div>
          </button>
          <UserLogged />
        </div>
      </div>
      {/* Hamburger Menu Icon for mobile */}
      <HamburgerMobile />
    </nav>
  );
}

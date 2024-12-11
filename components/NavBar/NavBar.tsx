'use client';

import Logo from '@/public/logos/small.svg';
import Link from 'next/link';
import HamburgerMobile from './HamburgerMobile/HamburgerMobile';
import styles from './NavBar.module.css';
import Routes from './Routes/Routes';
import SearchButton from './SearchButton/SearchButton';
import UserBadge from '@/components/NavBar/UserBadge/UserBadge';
import { useUser } from '@/util/hooks';
import ThemeSwitcher from '@/components/NavBar/ThemeSwitcher/ThemeSwitcher';

export default function NavBar() {
  const { user } = useUser();

  return (
    <>
      {user && (
        <nav className={styles.navbar}>
          <Link href={'/'} className={styles.logoLink}>
            <Logo />
          </Link>
          <div className={styles.content}>
            <Routes />
            {/* <Link href={'/donate'}>Donate</Link> */}
            <div className={styles.actions}>
              <SearchButton />
              <ThemeSwitcher />
              <UserBadge />
            </div>
          </div>
          {/* Hamburger Menu Icon for mobile */}
          <HamburgerMobile />
        </nav>
      )}
    </>
  );
}

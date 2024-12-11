'use client';

import Logo from '@/public/logos/small.svg';
import Link from 'next/link';
import HamburgerMobile from './HamburgerMobile/HamburgerMobile';
import styles from './NavBar.module.css';
import Routes from './Routes/Routes';
import SearchButton from './SearchButton/SearchButton';
import UserLogged from './UserLogged/UserLogged';

export default function NavBar() {
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
          <UserLogged />
        </div>
      </div>
      {/* Hamburger Menu Icon for mobile */}
      <HamburgerMobile />
    </nav>
  );
}

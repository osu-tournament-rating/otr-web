import { getUserData } from '@/app/actions';
import moonSVG from '@/public/icons/moon.svg';
import logo from '@/public/logos/small.svg';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import HamburgerMobile from './HamburgerMobile/HamburgerMobile';
import ModeSwitcher from './ModeSwitcher/ModeSwitcher';
import styles from './NavBar.module.css';
import Routes from './Routes/Routes';

export default async function NavBar() {
  const cookieMode = cookies().get('OTR-user-selected-osu-mode');
  const user = await getUserData();

  return (
    <nav className={styles.navbar}>
      <Link href={'/'} className={styles.logoLink}>
        <Image src={logo} alt="o!TR" fill />
      </Link>
      <div className={styles.content}>
        <Routes />
        <Link href={'/donate'}>Donate</Link>
        <div className={styles.actions}>
          <ModeSwitcher mode={cookieMode?.value} />
          <button>
            <div className={styles.darkModeSwitcher}>
              <Image src={moonSVG} alt="Dark Mode Switcher" fill />
            </div>
          </button>
          {!user?.error && (
            <div className={styles.userPropic}>
              <Image
                src={`http://s.ppy.sh/a/${user.osuId}`}
                alt="User Propic"
                fill
              />
            </div>
          )}
        </div>
      </div>
      {/* Hamburger Menu Icon for mobile */}
      <HamburgerMobile />
    </nav>
  );
}

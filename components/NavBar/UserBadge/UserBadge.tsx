'use client';

import { logout } from '@/app/actions/login';
import { useUser } from '@/util/hooks';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../NavBar.module.css';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import Tooltip from './../Tooltip/Tooltip';

const tooltipContent = (contextLogout: () => void) => (
  <>
    <Link href={'/admin'}>Admin</Link>
    <div>
      <button
        onClick={() => {
          contextLogout();
          return logout();
        }}
      >
        Sign out
      </button>
    </div>
  </>
);

export default function UserBadge() {
  const { user, logout: contextLogout } = useUser();

  return (
    <>
      {user && (
        <Tooltip content={tooltipContent(contextLogout)}>
          <div className={styles.userPropic}>
            <Image
              src={`http://s.ppy.sh/a/${user.player.osuId}`}
              alt="User Propic"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </Tooltip>
      )}
    </>
  );
}

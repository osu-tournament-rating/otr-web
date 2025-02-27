'use client';

import { useUser } from '@/util/hooks';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../NavBar.module.css';
import Tooltip from './../Tooltip/Tooltip';

const tooltipContent = (logout: () => void) => (
  <>
    <Link href={'/admin'}>Admin</Link>
    <div>
      <button onClick={logout}>Sign out</button>
    </div>
  </>
);

export default function UserBadge() {
  const { user, logout } = useUser();

  return (
    <>
      {user && (
        <Tooltip content={tooltipContent(logout)}>
          <div className={styles.userPropic}>
            <Image
              src={`https://s.ppy.sh/a/${user.player.osuId}`}
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

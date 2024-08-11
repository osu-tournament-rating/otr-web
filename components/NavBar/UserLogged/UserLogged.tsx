'use client';

import { useUser } from '@/util/hooks';
import Image from 'next/image';
import styles from '../NavBar.module.css';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import Tooltip from './../Tooltip/Tooltip';
const tooltipContent = (
  <>
    {/* <div>Friends</div> */}
    <div>Sign out</div>
    <div className={styles.iconContainer}>
      <ThemeSwitcher />
    </div>
  </>
);

export default function UserLogged() {
  const user = useUser();

  if (user?.osuId)
    return (
      <Tooltip content={tooltipContent}>
        <div className={styles.userPropic}>
          <Image
            src={`http://s.ppy.sh/a/${user?.osuId}`}
            alt="User Propic"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </Tooltip>
    );
}

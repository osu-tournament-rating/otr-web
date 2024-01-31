'use client';

import { useUser } from '@/util/hooks';
import Image from 'next/image';
import styles from '../NavBar.module.css';

export default function UserLogged() {
  const user = useUser();

  if (user?.osuId)
    return (
      <div className={styles.userPropic}>
        <Image
          src={`http://s.ppy.sh/a/${user?.osuId}`}
          alt="User Propic"
          fill
        />
      </div>
    );
}

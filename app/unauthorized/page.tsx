'use client';

import LoginButton from '@/components/Button/LoginButton';
import Card from '@/components/Card/Card';
import { useSetError, useUser } from '@/util/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Unauthorized() {
  const router = useRouter();
  const user = useUser();
  const setError = useSetError();

  if (user?.osuId) {
    return router.push('/');
  }

  setError(user?.error);

  return (
    <main className={styles.container} style={{ paddingTop: '2vw' }}>
      <Card
        title="Unauthorized"
        description="Currently, the o!TR website is in a closed pre-alpha state. Only whitelisted users are allowed. We will open things up once we have more features implemented. Thanks for your patience!"
      >
        <LoginButton />
      </Card>
    </main>
  );
}

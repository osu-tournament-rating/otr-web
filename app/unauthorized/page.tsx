'use client';

import LoginButton from '@/components/Button/LoginButton';
import Card from '@/components/Card/Card';
import { useUser } from '@/util/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Unauthorized() {
  const router = useRouter();
  const user = useUser();

  if (user?.osuId) {
    return router.push('/');
  }

  return (
    <main className={styles.container}>
      <Card
        title="Unauthorized"
        description="Currently, the o!TR website is in a closed pre-alpha state. Only whitelisted users are allowed. We will open things up once we have more features implemented. Thanks for your patience!"
      >
        <LoginButton />
      </Card>
    </main>
  );
}

'use client';

import LoginButton from '@/components/Button/LoginButton';
import Card from '@/components/Card/Card';
import { useUser } from '@/util/hooks';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { Roles } from '@osu-tournament-rating/otr-api-client';

export default function Unauthorized() {
  const router = useRouter();
  const { user } = useUser();

  if (user && user.scopes?.includes(Roles.Whitelist)) {
    return router.push('/');
  }

  return (
    <main
      className={styles.container}
      style={ !user ? { paddingTop: '2vw' } : undefined}
    >
      <Card
        title="Unauthorized"
        description="Currently, the o!TR website is in a closed pre-alpha state. Only whitelisted users are allowed. We will open things up once we have more features implemented. Thanks for your patience!"
      >
        <LoginButton />
      </Card>
    </main>
  );
}

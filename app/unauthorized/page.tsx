import LoginButton from '@/components/Button/LoginButton';
import Card from '@/components/Card/Card';
import Link from 'next/link';
import styles from './page.module.css';

export default function page() {
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

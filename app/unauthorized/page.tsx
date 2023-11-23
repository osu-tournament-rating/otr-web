import LoginButton from '@/components/Button/LoginButton';
import Card from '@/components/Card/Card';
import Link from 'next/link';
import styles from './page.module.css';

export default function page() {
  return (
    <main className={styles.container}>
      <Card
        title="Unauthorized"
        description="Looks like you need to login first!"
      >
        <LoginButton />
      </Card>
    </main>
  );
}

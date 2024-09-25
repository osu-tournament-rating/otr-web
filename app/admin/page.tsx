import styles from './page.module.css';

export const revalidate = 60;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel',
};

export default async function page() {
  return (
    <main className={styles.container}>
      <div className={styles.content}></div>
    </main>
  );
}

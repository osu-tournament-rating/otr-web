'use client';

import styles from './GridCard.module.css';

export default function GridCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <h1>{title}</h1>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

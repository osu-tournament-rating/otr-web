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
    <div
      className={styles.card}
      style={{
        paddingBottom: title === 'Winrate by mod' ? '0.2vw' : '2vw',
        gap: title === 'Winrate by mod' ? '0.2rem' : '1.3rem',
      }}
    >
      <h1>{title}</h1>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

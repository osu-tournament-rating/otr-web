'use client';

import clsx from 'clsx';
import styles from './GridCard.module.css';

const firstRow = ['Most played mods', 'General', 'Per match'];
const textCards = ['General', 'Per match'];

export default function GridCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        styles.card,
        firstRow.includes(title) ? styles.firstRow : ''
      )}
    >
      <h1>{title}</h1>
      <div
        className={clsx(
          styles.content,
          textCards.includes(title) ? styles.notGraph : ''
        )}
      >
        {children}
      </div>
    </div>
  );
}

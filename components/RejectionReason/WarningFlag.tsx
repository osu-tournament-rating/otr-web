'use client';

import ErrorCircle from '@/public/icons/ErrorCircle.svg';
import styles from './RejectionReason.module.css';
import clsx from 'clsx';

export default function WarningFlag({ children }: { children: string }) {
  return (
    <span className={clsx(styles.container, styles.warningFlag)}>
      <ErrorCircle className={styles.icon} />
      {children}
    </span>
  );
}

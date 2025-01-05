'use client';

import ErrorTriangle from '@/public/icons/ErrorTriangle.svg';
import styles from './RejectionReason.module.css';
import clsx from 'clsx';

export default function RejectionReason({ children }: { children: string }) {
  return (
    <span className={clsx(styles.container, styles.rejectionReason)}>
      <ErrorTriangle className={styles.icon} />
      {children}
    </span>
  );
}

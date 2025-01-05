'use client';

import ErrorTriangle from '@/public/icons/ErrorTriangle.svg';
import styles from './RejectionReason.module.css';

export default function RejectionReason({ children }: { children: string }) {
  return (
    <span className={styles.rejectionReasonContainer}>
      <ErrorTriangle className={styles.icon} />
      {children}
    </span>
  );
}

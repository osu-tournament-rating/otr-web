'use client';

import { statusButtonTypes } from '@/lib/types';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import styles from './StatusButton.module.css';

export default function StatusButton({
  status,
  canChange = false,
}: {
  status: number;
  canChange: boolean;
}) {
  return (
    <div
      className={clsx(
        styles.container,
        statusButtonTypes[status]?.className,
        canChange ? styles.canChange : ''
      )}
    >
      {statusButtonTypes[status]?.text}
      {canChange && <FontAwesomeIcon icon={faAngleDown} />}
    </div>
  );
}

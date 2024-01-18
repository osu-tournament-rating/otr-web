'use client';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import styles from './InfoIcon.module.css';

export default function InfoIcon({
  infoText,
  positionBottom,
  startLeft,
  children,
}: {
  infoText?: string;
  positionBottom?: boolean;
  startLeft?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.infoIcon}>
      <FontAwesomeIcon icon={faQuestion} />
      <div
        className={clsx(
          styles.tooltip,
          positionBottom === true ? styles.positionBottom : '',
          startLeft === true ? styles.startLeft : ''
        )}
      >
        {infoText || children}
      </div>
    </div>
  );
}

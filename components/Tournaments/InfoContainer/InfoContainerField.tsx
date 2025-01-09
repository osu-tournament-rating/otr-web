import { ReactNode } from 'react';
import styles from './TournamentInfoContainer.module.css';
import clsx from 'clsx';

export default function InfoContainerField({
  label,
  single = false,
  children,
}: {
  label: string;
  single?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={clsx(styles.field, single ? styles.single : '')}>
      <div className={styles.name}>{label}</div>
      {children}
    </div>
  );
}

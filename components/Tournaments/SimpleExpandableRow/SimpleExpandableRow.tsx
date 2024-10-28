import React from 'react';
import styles from './SimpleExpandableRow.module.css';

export default function SimpleExpandableRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.row}>{children}</div>;
}

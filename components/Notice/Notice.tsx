'use client';
import clsx from 'clsx';
import styles from './Notice.module.css';

export default function Notice({
  title,
  text,
  type = 'general',
  children,
}: {
  title: string;
  text?: string;
  type?: string;
  children?: React.ReactNode;
}) {
  const types: {
    [index: string]: string;
    general: any;
    alert: any;
    error: any;
  } = {
    general: '',
    alert: styles.alert,
    error: styles.error,
  };

  return (
    <div className={clsx(styles.notice, types[type] ?? '')}>
      <h4>{title}</h4>
      <p>{children ?? text}</p>
    </div>
  );
}

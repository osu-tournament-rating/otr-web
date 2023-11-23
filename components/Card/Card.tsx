'use client';
import styles from './Card.module.css';

export default function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      {title && <h1>{title}</h1>}
      <p>{description}</p>
      {children}
    </div>
  );
}

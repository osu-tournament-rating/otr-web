import styles from './StatsGrid.module.css';

export default function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

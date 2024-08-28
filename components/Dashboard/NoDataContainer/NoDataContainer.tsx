import OTRlogo from '@/public/logos/otr-logo-2.svg';
import Image from 'next/image';
import styles from './NoDataContainer.module.css';

export default function NoDataContainer() {
  return (
    <div className={styles.noDataContainer}>
      <div className={styles.noDataImageContainer}>
        <OTRlogo className="fill" />
      </div>
      <span className={styles.noDataText}>Not enough data</span>
    </div>
  );
}

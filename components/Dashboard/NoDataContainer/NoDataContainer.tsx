import Image from 'next/image';
import styles from './NoDataContainer.module.css';

export default function NoDataContainer() {
  return (
    <div className={styles.noDataContainer}>
      <div className={styles.noDataImageContainer}>
        <Image src={'/logos/otr-logo-2.svg'} alt="no rank" fill />
      </div>
      <span className={styles.noDataText}>Not enough data</span>
    </div>
  );
}

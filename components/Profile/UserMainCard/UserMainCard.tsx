'use client';
import Image from 'next/image';
import styles from './UserMainCard.module.css';

export default function UserMainCardProfile() {
  return (
    <div className={styles.userContainer}>
      <div className={styles.header}>
        <div className={styles.propic}>
          <Image
            src={'http://s.ppy.sh/a/4001304'}
            alt={"Player's propic"}
            fill
          />
        </div>
        <div className={styles.username}>Akinari</div>
      </div>
      <div className={styles.rankings}>
        <div className={styles.item} id="Rating">
          <div className={styles.label}>Rating</div>
          <div className={styles.value}>1748</div>
        </div>
        <div className={styles.item} id="Global">
          <div className={styles.label}>Global</div>
          <div className={styles.value}>#4,037</div>
        </div>
        <div className={styles.item} id="Country">
          <div className={styles.label}>Country</div>
          <div className={styles.value}>#47</div>
        </div>
        <div className={styles.item} id="Percentile">
          <div className={styles.label}>Percentile</div>
          <div className={styles.value}>46.951%</div>
        </div>
        <div className={styles.item} id="Tier">
          <div className={styles.label}>Tier</div>
          <div className={styles.value}>Bronze</div>
        </div>
      </div>
    </div>
  );
}

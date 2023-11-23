'use client';
import styles from './UserRatingProgressBar.module.css';

export default function UserRatingProgressBar({ data }: { data: {} }) {
  const currentXP =
    ((data.ratingDelta - data.ratingForNextTier) / data.ratingDelta) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.progressBar}>
        <div className={styles.splits}>
          {[...Array(9)].map((_, index) => (
            <div key={index} className={styles.split} />
          ))}
        </div>
        <div
          className={styles.currentProgress}
          style={{ width: `${currentXP}%` }}
        />
      </div>
      <div className={styles.text}>
        <span>{data.ratingForNextTier} TR</span> left until{' '}
        <span>{data.nextTier}</span>
      </div>
    </div>
  );
}

'use client';
import styles from './UserRatingProgressBar.module.css';

const currentTierNumber = (current) => {
  if (current === 3) {
    return 1;
  }
  if (current === 2) {
    return 2;
  }
  if (current === 1) {
    return 3;
  }
};

export default function UserRatingProgressBar({ data }: { data: {} }) {
  const currentTier = currentTierNumber(data.currentSubTier);

  return (
    <div className={styles.container}>
      <div className={styles.tiers}>
        {[...Array(3)].map((_, index) => (
          <div className={styles.tier} key={index}>
            <div className={styles.bar}>
              <div
                className={styles.currentProgress}
                style={
                  index + 1 === currentTier
                    ? { width: `${data.subTierFillPercentage * 100}%` }
                    : index + 1 > currentTier
                    ? { width: '0%' }
                    : index + 1 < currentTier
                    ? { width: `100%` }
                    : null
                }
              />
            </div>
          </div>
        ))}
        <div className={styles.nextRank}></div>
      </div>
      <div className={styles.text}>
        <span>{data.ratingForNextMajorTier.toFixed(0)} TR</span> until{' '}
        <span>{data.nextMajorTier}</span>
      </div>
    </div>
  );
}

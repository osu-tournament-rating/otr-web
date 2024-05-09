'use client';

import styles from './InlineChart.module.css';

export default function InlineChart({ matchesData }: { matchesData?: {} }) {
  const wonPercentage = (
    ((matchesData.matchesPlayed - matchesData.matchesLost) /
      matchesData.matchesPlayed) *
    100
  ).toFixed(1);
  const lostPercentage = (
    ((matchesData.matchesPlayed - matchesData.matchesWon) /
      matchesData.matchesPlayed) *
    100
  ).toFixed(1);

  return (
    <div className={styles.chart}>
      <div className={styles.line}>
        <div
          className={styles.segment}
          style={{
            width: `${wonPercentage}%`,
            borderRadius:
              wonPercentage >= 100 ? '0.75rem' : '0.75rem 0 0 0.75rem',
            backgroundColor: 'hsla(var(--green-400))',
          }}
        >
          {wonPercentage >= 5 && (
            <>
              <span className={styles.percentile}>{wonPercentage}</span>
              <span className={styles.label}>{matchesData.matchesWon} won</span>
            </>
          )}
        </div>
        <div
          className={styles.segment}
          style={{
            width: `${lostPercentage}%`,
            borderRadius:
              lostPercentage >= 100 ? '0.75rem' : '0 0.75rem 0.75rem 0',
            backgroundColor: 'hsla(var(--red-400))',
          }}
        >
          {lostPercentage >= 5 && (
            <>
              <span className={styles.percentile}>{lostPercentage}</span>
              <span className={styles.label}>
                {matchesData.matchesLost} lost
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

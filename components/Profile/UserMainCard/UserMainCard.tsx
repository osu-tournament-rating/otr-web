'use client';
import Image from 'next/image';
import styles from './UserMainCard.module.css';

export default function UserMainCardProfile({
  generalStats,
  playerInfo,
}: {
  generalStats: object;
  playerInfo: object;
}) {
  return (
    <div className={styles.userContainer}>
      <div className={styles.header}>
        <div className={styles.propic}>
          <Image
            src={`http://s.ppy.sh/a/${playerInfo?.osuId}`}
            alt={"Player's propic"}
            fill
          />
        </div>
        <div className={styles.username}>{playerInfo?.username}</div>
      </div>
      <div className={styles.rankings}>
        <div className={styles.item} id="Rating">
          <div className={styles.label}>Rating</div>
          <div className={styles.value}>
            {Math.round(generalStats?.rating)}
            {/* <FontAwesomeIcon
                icon={faAngleUp}
                className={clsx(styles.arrowIcon, styles.positiveTrend)}
              /> */}
          </div>
        </div>
        <div className={styles.item} id="Global">
          <div className={styles.label}>Global</div>
          <div className={styles.value}>
            {`#${generalStats?.globalRank.toLocaleString('en-US')}`}
            {/* <FontAwesomeIcon
                icon={faAngleUp}
                className={clsx(styles.arrowIcon, styles.negativeTrend)}
              /> */}
          </div>
        </div>
        <div className={styles.item} id="Country">
          <div className={styles.label}>Country</div>
          <div
            className={styles.value}
          >{`#${generalStats?.countryRank.toLocaleString('en-US')}`}</div>
        </div>
        <div className={styles.item} id="Percentile">
          <div className={styles.label}>Percentile</div>
          <div className={styles.value}>{`${(
            generalStats?.percentile * 100
          ).toFixed(1)}%`}</div>
        </div>
        <div className={styles.item} id="Tier">
          <div className={styles.label}>Tier</div>
          <div className={styles.value}>
            {generalStats?.rankProgress.currentTier}
          </div>
        </div>
      </div>
    </div>
  );
}

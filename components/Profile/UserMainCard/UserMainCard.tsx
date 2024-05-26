'use client';
import Image from 'next/image';
import { Tooltip } from 'react-tooltip';
import styles from './UserMainCard.module.css';

export default function UserMainCardProfile({
  baseStats,
  playerInfo,
}: {
  baseStats: object;
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
      {baseStats?.globalRank && (
        <div className={styles.rankings}>
          <div className={styles.item} id="Rating">
            <div className={styles.label}>Rating</div>
            <div className={styles.value}>
              {Math.round(baseStats?.rating)}
              {/* <FontAwesomeIcon
                icon={faAngleUp}
                className={clsx(styles.arrowIcon, styles.positiveTrend)}
              /> */}
            </div>
          </div>
          <div className={styles.item} id="Global">
            <div className={styles.label}>Global</div>
            <div className={styles.value}>
              {`#${baseStats?.globalRank.toLocaleString('en-US')}`}
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
            >{`#${baseStats?.countryRank.toLocaleString('en-US')}`}</div>
          </div>
          <div className={styles.item} id="Percentile">
            <div className={styles.label}>Percentile</div>
            <div className={styles.value}>{`${(
              baseStats?.percentile * 100
            ).toFixed(1)}%`}</div>
          </div>
          <div className={styles.item} id="Tier">
            <div className={styles.label}>Tier</div>
            <div className={styles.image}>
              <Tooltip
                id={`tooltip-${baseStats?.rankProgress.currentTier}`}
                style={{
                  borderRadius: '0.6em',
                  fontWeight: '500',
                  fontSize: '0.7em',
                  background: 'hsl(0,0%,82%)',
                  color: '#333',
                }}
                place={'right'}
              />
              <Image
                src={`/icons/ranks/${baseStats?.rankProgress.currentTier}.svg`}
                alt={baseStats?.rankProgress.currentTier}
                data-tooltip-id={`tooltip-${baseStats?.rankProgress.currentTier}`}
                data-tooltip-content={baseStats?.rankProgress.currentTier}
                data-tooltip-delay-show={400}
                fill
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

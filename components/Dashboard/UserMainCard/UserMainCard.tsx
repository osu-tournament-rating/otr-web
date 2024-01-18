'use client';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import Image from 'next/image';
import UserRatingProgressBar from '../UserRatingProgressBar/UserRatingProgressBar';
import styles from './UserMainCard.module.css';

export default function UserMainCard({ data }: { data: {} }) {
  return (
    <div className={styles.userContainer}>
      <div className={styles.tierImageContainer}>
        <div className={styles.tierImage}>
          <Image
            src={`http://s.ppy.sh/a/${data.playerId}`}
            alt={"Player's Tier"}
            fill
          />
        </div>
        {/* <div className={styles.username}>Akinari</div> */}
      </div>
      <div className={styles.rankings}>
        <div className={styles.header} id="Tier">
          {data.tier}
        </div>
        <div className={styles.itemsRow}>
          <div className={styles.item} id="Rating">
            <div className={styles.label}>Rating</div>
            <div className={styles.value}>
              {Math.round(data.rating)}
              {/* <FontAwesomeIcon
                icon={faAngleUp}
                className={clsx(styles.arrowIcon, styles.positiveTrend)}
              /> */}
            </div>
          </div>
          <div className={styles.item} id="Global">
            <div className={styles.label}>Global</div>
            <div className={styles.value}>
              {`#${data.globalRank.toLocaleString('en-US')}`}
              {/* <FontAwesomeIcon
                icon={faAngleUp}
                className={clsx(styles.arrowIcon, styles.negativeTrend)}
              /> */}
            </div>
          </div>
          <div className={styles.item} id="Country">
            <div className={styles.label}>Country</div>
            <div className={styles.value}>{`#${data.countryRank.toLocaleString(
              'en-US'
            )}`}</div>
          </div>
          <div className={styles.item} id="Percentile">
            <div className={styles.label}>Percentile</div>
            <div className={styles.value}>{`${(data.percentile * 100).toFixed(
              1
            )}%`}</div>
          </div>
        </div>
        <UserRatingProgressBar data={data} />
      </div>
    </div>
  );
}

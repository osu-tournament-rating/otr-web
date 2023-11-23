import InlineChart from '@/components/Charts/InlineChart/InlineChart';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './UserTotalMatches.module.css';

export default function UserTotalMatches({ data }: { data: {} }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.item}>
          <span>{data.matchesPlayed}</span>
          <div className={styles.text}>Matches</div>
        </div>
        <div className={styles.item}>
          <span>{data.gamesPlayed}</span>
          <div className={styles.text}>Maps</div>
        </div>
      </div>
      <div className={styles.chartLabel}>
        Matches <FontAwesomeIcon icon={faAngleRight} />{' '}
      </div>
      <InlineChart matchesData={data} />
    </div>
  );
}

'use client';

import AreaChart from '@/components/Charts/AreaChart/AreaChart';
import FormattedNumber from '@/components/FormattedNumber/FormattedNumber';
import styles from './UserStats.module.css';

export default function UserStats({ data }: { data: {} }) {
  return (
    <div className={styles.userStatsContainer}>
      <div className={styles.header}>
        <div className={styles.item}>
          <h1>
            #<FormattedNumber number={data.rank} />
          </h1>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Percentile</div>
          <div className={styles.value}>
            {(data.percentile * 100).toFixed(1)}%
          </div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Rating</div>
          <div className={styles.value}>{data.rating.toFixed(0)}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Matches</div>
          <div className={styles.value}>{data.matches}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Winrate</div>
          <div className={styles.value}>
            {parseFloat((data.winRate * 100).toFixed(2))}%
          </div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Highest Rank</div>
          <div className={styles.value}>
            #<FormattedNumber number={data.highestRank} />
          </div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Tier</div>
          <div className={styles.value}>{data.tier}</div>
        </div>
      </div>
      <div className={styles.chart}>
        <h1>TO DO</h1>
        <AreaChart rankChart={data.rankChart.chartData} />
      </div>
    </div>
  );
}

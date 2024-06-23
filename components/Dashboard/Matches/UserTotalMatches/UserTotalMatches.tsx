'use client';

import InlineChart from '@/components/Charts/InlineChart/InlineChart';
import clsx from 'clsx';
import { useState } from 'react';
import styles from './UserTotalMatches.module.css';

export default function UserTotalMatches({ data }: { data: {} }) {
  const [selectedTab, setSelectedTab] = useState('matches');

  return (
    <div className={clsx(styles.container, styles.userTotalMatches)}>
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
      <div className={styles.chartLabels}>
        <div
          className={clsx(
            styles.label,
            selectedTab === 'matches' ? styles.selected : ''
          )}
          onClick={() => setSelectedTab('matches')}
        >
          Matches
        </div>
        <div
          className={clsx(
            styles.label,
            selectedTab === 'games' ? styles.selected : ''
          )}
          onClick={() => setSelectedTab('games')}
        >
          Games
        </div>
      </div>
      <InlineChart
        won={selectedTab === 'matches' ? data.matchesWon : data.gamesWon}
        lost={selectedTab === 'matches' ? data.matchesLost : data.gamesLost}
        played={
          selectedTab === 'matches' ? data.matchesPlayed : data.gamesPlayed
        }
      />
    </div>
  );
}

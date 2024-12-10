'use client';

import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import styles from './TournamentList.module.css';
import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import clsx from 'clsx';

export default function TournamentList({
  tournaments
} : {
  tournaments: TournamentCompactDTO[]
}) {
  return (
    <div className={styles.gridList}>
      <div className={clsx(
        styles.row,
        styles.collapsed,
        styles.columnHeadings
      )}>
        <span>Name</span>
        <span>Format</span>
        <span>Ruleset</span>
        <span>Submitter</span>
        <span>Date</span>
      </div>
      {tournaments.map(tournament => {
        return (
          <TournamentListItem key={tournament.id} tournament={tournament} />
        );
      })}
    </div>
  )
}
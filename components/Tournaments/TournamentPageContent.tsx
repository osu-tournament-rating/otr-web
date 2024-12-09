'use client';

import styles from './TournamentPageContent.module.css';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import MatchesList from '@/components/Tournaments/Lists/MatchesList';
import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';
import { dateFormats } from '@/lib/dates';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import OutIcon from '@/public/icons/out.svg';
import Link from 'next/link';

export default function TournamentPageContent({
  tournament
}: {
  tournament: TournamentDTO
}) {
  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <span>
          <h1 className={styles.title}>{tournament.name}</h1>
          <Link href={tournament.forumUrl}>
            <OutIcon className={styles.outIcon}/>
          </Link>
        </span>
        <FormattedDate
          className={styles.date}
          date={tournament.startTime}
          format={dateFormats.tournaments.header}
        />
      </div>
      <TournamentInfoContainer data={tournament} showName={false} />
      <MatchesList data={tournament.matches} />
    </div>
  );
}
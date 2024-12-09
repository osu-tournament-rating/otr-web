import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/tournaments/TournamentPageContent.module.css';
import Link from 'next/link';
import OutIcon from '@/public/icons/out.svg';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';

export default function MatchesPageContent({
  match,
  showTournament = false
}: {
  match: MatchDTO;
  showTournament?: boolean;
}) {
  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <span>
          <h1 className={styles.title}>{match.name}</h1>
          <Link href={`https://osu.ppy.sh/mp/${match.osuId}`}>
            <OutIcon className={styles.outIcon}/>
          </Link>
        </span>
        <FormattedDate
          className={styles.date}
          date={match.startTime ?? ''}
          format={dateFormats.tournaments.header}
        />
      </div>
      {showTournament && (
        <div>
          <h1 className={styles.title}>Tournament</h1>
          <TournamentInfoContainer data={match.tournament} showName/>
        </div>
      )}
    </div>
  );
}
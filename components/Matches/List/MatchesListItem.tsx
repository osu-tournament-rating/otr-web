import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import clsx from 'clsx';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import { dateFormats } from '@/lib/dates';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import MatchRejectionReason from '@/components/RejectionReason/MatchRejectionReason';

export default function MatchesListItem({
  match,
  isExpanded,
  onClick,
}: {
  match: MatchDTO;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <div className={clsx(styles.listItem, styles.matchesListItem)}>
      <div className={styles.collapsed}>
        <div className={styles.gridRow}>
          <div className={styles.nameField}>
            <VerificationStatusCircle
              verificationStatus={match.verificationStatus}
            />
            <span>{match.name}</span>
          </div>
          {/** Start Date */}
          {match.startTime ? (
            <FormattedDate
              date={match.startTime}
              format={dateFormats.tournaments.listItem}
            />
          ) : (
            <span>Missing start time</span>
          )}
          {/** End Date */}
          {match.endTime ? (
            <FormattedDate
              date={match.endTime}
              format={dateFormats.tournaments.listItem}
            />
          ) : (
            <span>Missing end time</span>
          )}
        </div>
        <MatchRejectionReason rejectionReason={match.rejectionReason} />
      </div>
    </div>
  );
}

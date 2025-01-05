'use client';

import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import clsx from 'clsx';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import { dateFormats } from '@/lib/dates';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import MatchRejectionReason from '@/components/RejectionReason/MatchRejectionReason';
import MatchWarningFlags from '@/components/RejectionReason/MatchWarningFlag';

export default function MatchesListItem({
  data,
  isExpanded,
  onClick,
}: {
  data: MatchDTO;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <div className={clsx(styles.listItem, styles.matchesListItem)}>
      {isExpanded ? (
        <ExpandedContent />
      ) : (
        <CollapsedContent data={data} onClick={onClick} />
      )}
    </div>
  );
}

function ExpandedContent() {
  return <div className={styles.expanded}> </div>;
}

function CollapsedContent({
  data,
  onClick,
}: {
  data: MatchDTO;
  onClick: () => void;
}) {
  return (
    <div className={styles.collapsed} onClick={onClick}>
      <div className={styles.gridRow}>
        <div className={styles.nameField}>
          <VerificationStatusCircle
            verificationStatus={data.verificationStatus}
          />
          <span>{data.name}</span>
        </div>
        {/** Start Date */}
        {data.startTime ? (
          <FormattedDate
            date={data.startTime}
            format={dateFormats.tournaments.listItem}
          />
        ) : (
          <span>Missing start time</span>
        )}
        {/** End Date */}
        {data.endTime ? (
          <FormattedDate
            date={data.endTime}
            format={dateFormats.tournaments.listItem}
          />
        ) : (
          <span>Missing end time</span>
        )}
      </div>
      <MatchRejectionReason rejectionReason={data.rejectionReason} />
      <MatchWarningFlags warningFlags={data.warningFlags} />
    </div>
  );
}

'use client';

import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import clsx from 'clsx';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import { dateFormats } from '@/lib/dates';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import WarningFlags from '@/components/Enums/WarningFlags';
import RejectionReason from '@/components/Enums/RejectionReason';

export default function MatchesListItem({ data }: { data: MatchDTO }) {
  return (
    <div className={clsx(styles.listItem, styles.matchesListItem)}>
      <div className={styles.collapsed}>
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
        <RejectionReason itemType={'match'} value={data.rejectionReason} />
        <WarningFlags itemType={'match'} value={data.warningFlags} />
      </div>
    </div>
  );
}

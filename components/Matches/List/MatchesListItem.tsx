'use client';

import {
  GameRejectionReason,
  MatchDTO,
} from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import { dateFormats } from '@/lib/dates';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import WarningFlags from '@/components/Enums/WarningFlags';
import RejectionReason from '@/components/Enums/RejectionReason';
import { Tooltip } from 'react-tooltip';

export default function MatchesListItem({ data }: { data: MatchDTO }) {
  return (
    <div className={styles.listItem}>
      <div className={styles.collapsed}>
        <div className={styles.gridRow}>
          <div className={styles.nameField}>
            <VerificationStatusCircle
              verificationStatus={data.verificationStatus}
            />
            <span>{data.name}</span>
          </div>
          <div className={styles.gameVerificationPreview}>
            {data.games
              .toSorted(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime()
              )
              .map((g) => {
                const tooltipId =
                  g.rejectionReason !== GameRejectionReason.None
                    ? `${g.id}-rejection-tooltip`
                    : undefined;

                return (
                  <>
                    <VerificationStatusCircle
                      key={`${g.id}-verification-status`}
                      verificationStatus={g.verificationStatus}
                      tooltipId={tooltipId}
                    />
                    {tooltipId && (
                      <Tooltip id={tooltipId}>
                        <RejectionReason
                          itemType={'game'}
                          value={g.rejectionReason}
                        />
                      </Tooltip>
                    )}
                  </>
                );
              })}
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

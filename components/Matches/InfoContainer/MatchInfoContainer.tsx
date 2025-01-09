'use client';

import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/InfoContainer/TournamentInfoContainer.module.css';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import { useAdminViewContext } from '@/components/Context/AdminViewContext';
import VerificationStatusButton from '@/components/Button/VerificationStatusButton/VerificationStatusButton';
import { patchMatchData } from '@/app/actions/matches';
import MatchRejectionReason from '@/components/RejectionReason/MatchRejectionReason';
import clsx from 'clsx';
import MatchWarningFlags from '@/components/RejectionReason/MatchWarningFlag';
import InfoContainerField from '@/components/Tournaments/InfoContainer/InfoContainerField';
import Link from 'next/link';

export default function MatchInfoContainer({
  data,
  showTournament = false,
  showName = false,
}: {
  data: MatchDTO;
  showTournament?: boolean;
  showName?: boolean;
}) {
  // const { isAdminView } = useAdminViewContext();
  const isAdminView = true;

  return (
    <div className={styles.content}>
      {isAdminView && (
        <>
          {/* Shows confirmation modal */}
          <div className={styles.field}>
            <button>Delete</button>
          </div>
          {/* Active / visible if processing status == awaiting verification */}
          <div className={styles.field}>
            <button>Accept pre-status</button>
          </div>
          <div className={styles.field}>
            <VerificationStatusButton
              initialStatus={data.verificationStatus}
              isAdminView
              onChange={async (status) => {
                const updatedMatch = await patchMatchData({
                  id: data.id,
                  path: 'verificationStatus',
                  value: status,
                });
                Object.assign(data, updatedMatch);
              }}
            />
          </div>
        </>
      )}
      {showName && (
        <InfoContainerField label={'Name'} single>
          <div className={styles.value}>{data.name}</div>
        </InfoContainerField>
      )}
      <div className={clsx(styles.field, styles.single)}>
        <MatchRejectionReason rejectionReason={data.rejectionReason} />
      </div>
      <div className={clsx(styles.field, styles.single)}>
        <MatchWarningFlags warningFlags={data.warningFlags} />
      </div>
      {showTournament && (
        <div>
          <Link href={`/tournaments/${data.tournament.id}`}>
            <h1 className={styles.title}>Tournament</h1>
          </Link>
          <TournamentInfoContainer data={data.tournament} showName />
        </div>
      )}
    </div>
  );
}

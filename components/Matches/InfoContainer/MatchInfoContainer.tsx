'use client';

import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/InfoContainer/TournamentInfoContainer.module.css';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import { useAdminViewContext } from '@/components/Context/AdminViewContext';
import VerificationStatusButton from '@/components/Button/VerificationStatusButton/VerificationStatusButton';
import { patchMatchData } from '@/app/actions/matches';
import clsx from 'clsx';
import InfoContainerField from '@/components/Tournaments/InfoContainer/InfoContainerField';
import Link from 'next/link';
import WarningFlags from '@/components/Enums/WarningFlags';
import RejectionReason from '@/components/Enums/RejectionReason';

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

  return (
    <div className={styles.content}>
      {showName && (
        <InfoContainerField label={'Name'} single>
          <div className={styles.value}>{data.name}</div>
        </InfoContainerField>
      )}
      <div className={clsx(styles.field, styles.single)}>
        <RejectionReason itemType={'match'} value={data.rejectionReason} />
      </div>
      <div className={clsx(styles.field, styles.single)}>
        <WarningFlags itemType={'match'} value={data.warningFlags} />
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

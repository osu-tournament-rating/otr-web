'use client';

import { GameDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import clsx from 'clsx';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';
import Link from 'next/link';

export default function GamesListRowItem({ data }: { data: GameDTO }) {
  return (
    <div className={clsx(styles.listItem, styles.matchesListItem)}>
      <div className={styles.collapsed}>
        <div className={styles.gridRow}>
          <div className={styles.nameField}>
            <VerificationStatusCircle
              verificationStatus={data.verificationStatus}
            />
            <span>
              {data.beatmap?.title} [{data.beatmap?.diffName}]
            </span>
          </div>
        </div>
        <RejectionReason itemType={'game'} value={data.rejectionReason} />
        <WarningFlags itemType={'game'} value={data.warningFlags} />
      </div>
    </div>
  );
}

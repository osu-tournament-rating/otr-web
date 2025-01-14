'use client';

import { GameScoreDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import RejectionReason from '@/components/Enums/RejectionReason';

export default function ScoresListItem({ data }: { data: GameScoreDTO }) {
  return (
    <div className={styles.listItem}>
      <div className={styles.collapsed}>
        <div className={styles.gridRow}>
          <div className={styles.nameField}>
            <VerificationStatusCircle
              verificationStatus={data.verificationStatus}
            />
            <span>{`Player ${data.playerId}`}</span>
          </div>
          <span>{data.score}</span>
        </div>
        <RejectionReason itemType={'game'} value={data.rejectionReason} />
      </div>
    </div>
  );
}

'use client';

import { GameScoreDTO, PlayerCompactDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import RejectionReason from '@/components/Enums/RejectionReason';
import { ModsEnumHelper, TeamEnumHelper } from '@/lib/enums';

export default function ScoresListItem({ data, player }: { data: GameScoreDTO, player?: PlayerCompactDTO }) {
  return (
    <div className={styles.listItem}>
      <div className={styles.collapsed}>
        <div className={styles.gridRow}>
          <div className={styles.nameField}>
            <VerificationStatusCircle
              verificationStatus={data.verificationStatus}
            />
            <span>{player?.username ?? `Player ${data.playerId}`}</span>
          </div>
          <span>Team {TeamEnumHelper.getMetadata(data.team).text}</span>
          <span>{ModsEnumHelper.getMetadata(data.mods)
            .map(({ text }) => text)
            .join(', ')}</span>
          <span>{data.accuracy.toFixed(2)}%</span>
          <span>{'{'}{data.count300}/{data.count100}/{data.count50}/{data.countMiss}{'}'}</span>
          <span>{data.score}</span>
        </div>
        <RejectionReason itemType={'game'} value={data.rejectionReason} />
      </div>
    </div>
  );
}

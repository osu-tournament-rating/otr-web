'use client';

import RejectionReason from '@/components/Enums/RejectionReason';
import Modal from '@/components/Modal/Modal';
import ScoreAdminView from '@/components/Scores/AdminView/ScoreAdminView';
import {
  ModsEnumHelper,
  ScoreGradeEnumHelper,
  ScoreProcessingStatusEnumHelper,
  TeamEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import EditIcon from '@/public/icons/Edit.svg';
import {
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import clsx from 'clsx';
import { useState } from 'react';
import styles from './GameScore.module.css';

export default function GameScore({
  row,
  data,
  player,
}: {
  row: number;
  data: GameScoreDTO;
  player?: PlayerCompactDTO;
}) {
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

  return (
    <div
      className={styles.scoreContainer}
      aria-team={Team[data.team]}
      style={{
        gridRow: row,
      }}
    >
      <div
        className={styles.propic}
        style={{ backgroundImage: `url(https://s.ppy.sh/a/${player?.osuId})` }}
      />
      <div className={styles.teamColor} />
      <div className={styles.backgroundColor} />
      <div className={styles.column}>
        {/* <span>{player?.username ?? `Player ${data.playerId}`}</span>
      <span>
        {ScoreGradeEnumHelper.getMetadata(data.grade).text} |{' '}
        {ModsEnumHelper.getMetadata(data.mods)
          .map(({ text }) => text)
          .join(', ')}
      </span>
      <span>
        {data.score} {data.maxCombo}x [{data.count300}/{data.count100}/
        {data.count50}/{data.countMiss}] {data.accuracy.toFixed(2)}%
      </span>
      <span>Team {TeamEnumHelper.getMetadata(data.team).text}</span>
      <span>
        Verification Status:{' '}
        {VerificationStatusMetadata[data.verificationStatus].text}
      </span>
      <span>
        Processing Status:{' '}
        {
          ScoreProcessingStatusEnumHelper.getMetadata(data.processingStatus)
            .text
        }
      </span>
      <RejectionReason itemType={'score'} value={data.rejectionReason} />
      <EditIcon
        className={'fill'}
        style={{ height: '1rem', width: '1rem', cursor: 'pointer' }}
        onClick={() => setIsAdminViewOpen(true)}
      />
      <Modal
        title={`Editing Score Id: ${data.id}`}
        isOpen={isAdminViewOpen}
        setIsOpen={(isOpen) => setIsAdminViewOpen(isOpen)}
      >
        <ScoreAdminView data={data} />
      </Modal> */}
      </div>
    </div>
  );
}

'use client';

import clsx from 'clsx';
import styles from './GameScore.module.css';
import {
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import {
  ModsEnumHelper,
  ScoreGradeEnumHelper,
  ScoreProcessingStatusEnumHelper,
  TeamEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import { Attributes } from 'react';

export default function GameScore({
  key,
  row,
  data,
  player,
}: {
  row: number;
  data: GameScoreDTO;
  player?: PlayerCompactDTO;
} & Pick<Attributes, 'key'>) {
  return (
    <div
      key={key}
      className={clsx(
        'content',
        styles.scoreContainer,
        styles[`team-${Team[data.team]}`]
      )}
      style={{ gridRow: row }}
    >
      <span>{player?.username ?? `Player ${data.playerId}`}</span>
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
    </div>
  );
}

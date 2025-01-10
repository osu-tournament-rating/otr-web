'use client';

import ErrorTriangle from '@/public/icons/ErrorTriangle.svg';
import styles from './Enums.module.css';
import clsx from 'clsx';
import { ApiItemType } from '@/lib/types';
import {
  EnumMetadata,
  gameRejectionReasonMetadata,
  getEnumFlags,
  matchRejectionReasonMetadata,
  scoreRejectionReasonMetadata,
  tournamentRejectionReasonMetadata,
} from '@/lib/enums';
import {
  GameRejectionReason,
  MatchRejectionReason,
  ScoreRejectionReason,
  TournamentRejectionReason,
} from '@osu-tournament-rating/otr-api-client';
import { Tooltip } from 'react-tooltip';

export default function RejectionReason({
  itemType,
  value,
}: {
  itemType: ApiItemType;
  value: number;
}) {
  let reasonMetadata: EnumMetadata[] = [];

  if (value === 0) {
    return null;
  }

  switch (itemType) {
    case 'tournament':
      reasonMetadata = getEnumFlags(value, TournamentRejectionReason).map(
        (flag) => tournamentRejectionReasonMetadata[flag]
      );
      break;
    case 'match':
      reasonMetadata = getEnumFlags(value, MatchRejectionReason).map(
        (flag) => matchRejectionReasonMetadata[flag]
      );
      break;
    case 'game':
      reasonMetadata = getEnumFlags(value, GameRejectionReason).map(
        (flag) => gameRejectionReasonMetadata[flag]
      );
      break;
    case 'score':
      reasonMetadata = getEnumFlags(value, ScoreRejectionReason).map(
        (flag) => scoreRejectionReasonMetadata[flag]
      );
      break;
  }

  return (
    <span className={clsx(styles.enumContainer, styles.rejectionReason)}>
      <ErrorTriangle className={styles.icon} />
      {reasonMetadata.map(({ text, description }, idx) => (
        <span
          key={idx}
          className={styles.individualItem}
          data-tooltip-id={`${itemType}-rejectionreason-tooltip`}
          data-tooltip-content={description}
        >
          {text}
        </span>
      ))}
      <Tooltip id={`${itemType}-rejectionreason-tooltip`} delayShow={300} />
    </span>
  );
}

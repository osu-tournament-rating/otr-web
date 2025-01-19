'use client';

import ErrorTriangle from '@/public/icons/ErrorTriangle.svg';
import styles from './Enums.module.css';
import clsx from 'clsx';
import { ApiItemType } from '@/lib/types';
import {
  GameRejectionReasonEnumHelper,
  MatchRejectionReasonEnumHelper,
  ScoreRejectionReasonEnumHelper,
  TournamentRejectionReasonEnumHelper,
} from '@/lib/enums';
import { Tooltip } from 'react-tooltip';

export default function RejectionReason({
  itemType,
  value,
}: {
  itemType: ApiItemType;
  value: number;
}) {
  if (value === 0) {
    return null;
  }

  let metadata;
  switch (itemType) {
    case 'tournament':
      metadata = TournamentRejectionReasonEnumHelper.getMetadata(value);
      break;
    case 'match':
      metadata = MatchRejectionReasonEnumHelper.getMetadata(value);
      break;
    case 'game':
      metadata = GameRejectionReasonEnumHelper.getMetadata(value);
      break;
    case 'score':
      metadata = ScoreRejectionReasonEnumHelper.getMetadata(value);
      break;
  }

  return (
    <span className={clsx(styles.enumContainer, styles.rejectionReason)}>
      <ErrorTriangle className={styles.icon} />
      {metadata.map(({ text, description }, idx) => (
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

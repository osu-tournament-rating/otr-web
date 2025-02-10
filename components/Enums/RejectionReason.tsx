'use client';

import {
  GameRejectionReasonEnumHelper,
  MatchRejectionReasonEnumHelper,
  ScoreRejectionReasonEnumHelper,
  TournamentRejectionReasonEnumHelper,
} from '@/lib/enums';
import { ApiItemType } from '@/lib/types';
import ErrorTriangle from '@/public/icons/ErrorTriangle.svg';
import clsx from 'clsx';
import { Tooltip } from 'react-tooltip';
import styles from './Enums.module.css';

export default function RejectionReason({
  itemType,
  value,
  alignment,
  hoverable,
}: {
  itemType: ApiItemType;
  value: number;
  alignment: string;
  hoverable: boolean;
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
    <span
      className={clsx(
        styles.enumContainer,
        styles.rejectionReason,
        alignment === 'right' ? styles.reverse : null,
        hoverable ? styles.hoverable : null
      )}
    >
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

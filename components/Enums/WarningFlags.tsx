'use client';

import ErrorCircle from '@/public/icons/ErrorCircle.svg';
import styles from './Enums.module.css';
import clsx from 'clsx';
import { ApiItemType } from '@/lib/types';
import {
  EnumMetadata,
  gameWarningFlagsMetadata,
  getEnumFlags,
  matchWarningFlagMetadata,
} from '@/lib/enums';
import {
  GameWarningFlags,
  MatchWarningFlags,
} from '@osu-tournament-rating/otr-api-client';
import { Tooltip } from 'react-tooltip';

export default function WarningFlags({
  itemType,
  value,
}: {
  itemType: Omit<ApiItemType, 'tournament' | 'score'>;
  value: number;
}) {
  let reasonMetadata: EnumMetadata[] = [];

  if (value === 0) {
    return null;
  }

  switch (itemType) {
    case 'match':
      reasonMetadata = getEnumFlags(value, MatchWarningFlags).map(
        (flag) => matchWarningFlagMetadata[flag]
      );
      break;
    case 'game':
      reasonMetadata = getEnumFlags(value, GameWarningFlags).map(
        (flag) => gameWarningFlagsMetadata[flag]
      );
      break;
  }

  return (
    <span className={clsx(styles.enumContainer, styles.warningFlag)}>
      <ErrorCircle className={styles.icon} />
      {reasonMetadata.map(({ text, description }, idx) => (
        <span
          key={idx}
          className={styles.individualItem}
          data-tooltip-id={`${itemType}-warningflag-tooltip`}
          data-tooltip-content={description}
        >
          {text}
        </span>
      ))}
      <Tooltip id={`${itemType}-warningflag-tooltip`} delayShow={300} />
    </span>
  );
}

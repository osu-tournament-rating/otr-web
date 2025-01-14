'use client';

import ErrorCircle from '@/public/icons/ErrorCircle.svg';
import styles from './Enums.module.css';
import clsx from 'clsx';
import { ApiItemType } from '@/lib/types';
import {
  GameWarningFlagsEnumHelper,
  MatchWarningFlagsEnumHelper,
} from '@/lib/enums';
import { Tooltip } from 'react-tooltip';

export default function WarningFlags({
  itemType,
  value,
}: {
  itemType: Omit<ApiItemType, 'tournament' | 'score'>;
  value: number;
}) {
  if (value === 0) {
    return null;
  }

  let metadata;
  switch (itemType) {
    case 'match':
      metadata = MatchWarningFlagsEnumHelper.getMetadata(value);
      break;
    default:
      metadata = GameWarningFlagsEnumHelper.getMetadata(value);
      break;
  }

  return (
    <span className={clsx(styles.enumContainer, styles.warningFlag)}>
      <ErrorCircle className={styles.icon} />
      {metadata.map(({ text, description }, idx) => (
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

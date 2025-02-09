'use client';

import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import styles from './VerificationStatusCircle.module.css';
import clsx from 'clsx';

export default function VerificationStatusCircle({
  verificationStatus,
  tooltipId,
}: {
  verificationStatus: VerificationStatus;
  tooltipId?: string;
}) {
  console.log(VerificationStatus[verificationStatus]);

  return (
    <span
      className={clsx(
        styles.statusCircle,
        styles[VerificationStatus[verificationStatus]]
      )}
      data-tooltip-id={tooltipId}
    />
  );
}

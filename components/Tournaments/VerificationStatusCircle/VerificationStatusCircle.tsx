import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import { VerificationStatusMetadata } from '@/lib/enums';
import styles from './VerificationStatusCircle.module.css';
import clsx from 'clsx';

export default function VerificationStatusCircle({
  verificationStatus,
}: {
  verificationStatus: VerificationStatus;
}) {
  const verificationStatusMetadata =
    VerificationStatusMetadata[verificationStatus];

  return (
    <span
      className={clsx(
        styles.statusCircle,
        styles[verificationStatusMetadata.className]
      )}
    />
  );
}

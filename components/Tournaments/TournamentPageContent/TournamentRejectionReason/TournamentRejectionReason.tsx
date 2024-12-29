import {
  TournamentRejectionReason as TournamentRejectionReasonEnum
} from '@osu-tournament-rating/otr-api-client';
import { getEnumFlags, TournamentRejectionReasonMetadata } from '@/lib/enums';
import ErrorTriangle from '@/public/icons/ErrorTriangle.svg';
import styles from './TournamentRejectionReason.module.css';

export default function TournamentRejectionReason({
  rejectionReason
}: {
  rejectionReason: TournamentRejectionReasonEnum
}) {
  const rejectionReasonMetadata = getEnumFlags(rejectionReason, TournamentRejectionReasonEnum).map(
    (flag) => TournamentRejectionReasonMetadata[flag]
  );

  if (!rejectionReasonMetadata.length) {
    return null;
  }

  return (
    <span className={styles.rejectionReasonContainer}>
      <ErrorTriangle className={styles.icon} />
      {rejectionReasonMetadata.map(meta => meta.text).join(', ')}
    </span>
  );
}
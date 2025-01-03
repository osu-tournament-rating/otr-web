import { MatchRejectionReason as MatchRejectionReasonEnum } from '@osu-tournament-rating/otr-api-client';
import { getEnumFlags, MatchRejectionReasonMetadata } from '@/lib/enums';
import RejectionReason from './RejectionReason';

export default function MatchRejectionReason({
  rejectionReason,
}: {
  rejectionReason: MatchRejectionReasonEnum;
}) {
  const rejectionReasonMetadata = getEnumFlags(
    rejectionReason,
    MatchRejectionReasonEnum
  ).map((flag) => MatchRejectionReasonMetadata[flag]);

  if (!rejectionReasonMetadata.length) {
    return null;
  }

  return (
    <RejectionReason>
      {rejectionReasonMetadata.map((meta) => meta.text).join(', ')}
    </RejectionReason>
  );
}

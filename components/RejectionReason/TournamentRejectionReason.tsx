'use client';

import { TournamentRejectionReason as TournamentRejectionReasonEnum } from '@osu-tournament-rating/otr-api-client';
import { getEnumFlags, TournamentRejectionReasonMetadata } from '@/lib/enums';
import RejectionReason from './RejectionReason';

export default function TournamentRejectionReason({
  rejectionReason,
}: {
  rejectionReason: TournamentRejectionReasonEnum;
}) {
  const rejectionReasonMetadata = getEnumFlags(
    rejectionReason,
    TournamentRejectionReasonEnum
  ).map((flag) => TournamentRejectionReasonMetadata[flag]);

  if (!rejectionReasonMetadata.length) {
    return null;
  }

  return (
    <RejectionReason>
      {rejectionReasonMetadata.map((meta) => meta.text).join(', ')}
    </RejectionReason>
  );
}

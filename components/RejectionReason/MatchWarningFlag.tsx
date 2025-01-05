import { MatchWarningFlags as MatchWarningFlagsEnum } from '@osu-tournament-rating/otr-api-client';
import { getEnumFlags, MatchWarningFlagMetadata } from '@/lib/enums';
import WarningFlag from './WarningFlag';

export default function MatchWarningFlags({
  warningFlags,
}: {
  warningFlags: MatchWarningFlagsEnum;
}) {
  const warningFlagsMetadata = getEnumFlags(
    warningFlags,
    MatchWarningFlagsEnum
  ).map((flag) => MatchWarningFlagMetadata[flag]);

  if (!warningFlagsMetadata.length) {
    return null;
  }

  return (
    <WarningFlag>
      {warningFlagsMetadata.map((meta) => meta.text).join(', ')}
    </WarningFlag>
  );
}

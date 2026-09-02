import { VerificationStatus } from '@otr/core/osu';

import type { TierName } from '@/lib/utils/tierData';

export const primary = 0x5a8ff0;
export const grey = 0x8c8c8c;
export const amber = 0xddb246;
export const red = 0xe83030;

const tierColors: Record<TierName, number> = {
  'Elite Grandmaster': primary,
  Grandmaster: red,
  Master: 0x914bec,
  Diamond: 0xaf57db,
  Emerald: 0x2dd26f,
  Platinum: 0x3691b5,
  Gold: amber,
  Silver: grey,
  Bronze: 0xc8732d,
};

export const tierColor = (tier: string) => tierColors[tier as TierName] ?? grey;

export const statusColor = (status: VerificationStatus) => {
  switch (status) {
    case VerificationStatus.Verified:
      return primary;
    case VerificationStatus.PreVerified:
      return amber;
    case VerificationStatus.PreRejected:
    case VerificationStatus.Rejected:
      return red;
    default:
      return grey;
  }
};

export const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import { Badge } from '../ui/badge';
import {
  CheckIcon,
  ChevronsUpIcon,
  EllipsisIcon,
  PauseIcon,
  XIcon,
} from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';

export default function VerificationBadge({
  verificationStatus,
  text = false,
}: {
  verificationStatus: VerificationStatus;

  /** Include verification status as text */
  text: boolean;
}) {
  switch (verificationStatus) {
    case VerificationStatus.None:
      return (
        <SimpleTooltip content={'Pending'}>
          <Badge variant={'outline'}>
            <PauseIcon /> {text && 'Pending'}
          </Badge>
        </SimpleTooltip>
      );
    case VerificationStatus.PreRejected:
      return (
        <SimpleTooltip content={'Pre-Rejected'}>
          <Badge className="text-red-500" variant={'outline'}>
            <EllipsisIcon /> {text && 'Pre-Rejected'}
          </Badge>
        </SimpleTooltip>
      );
    case VerificationStatus.PreVerified:
      return (
        <SimpleTooltip content={'Pre-Verified'}>
          <Badge className="text-green-500" variant={'outline'}>
            <ChevronsUpIcon /> {text && 'Pre-Verified'}
          </Badge>
        </SimpleTooltip>
      );
    case VerificationStatus.Rejected:
      return (
        <SimpleTooltip content={'Rejected'}>
          <Badge className="text-red-500" variant={'outline'}>
            <XIcon /> {text && 'Rejected'}
          </Badge>
        </SimpleTooltip>
      );
    case VerificationStatus.Verified:
      return (
        <SimpleTooltip content={'Verified'}>
          <Badge className="text-green-500" variant={'outline'}>
            <CheckIcon /> {text && 'Verified'}
          </Badge>
        </SimpleTooltip>
      );
    default:
      return null;
  }
}

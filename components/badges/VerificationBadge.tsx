import { VerificationStatusEnumHelper } from '@/lib/enums';
import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import {
  CheckIcon,
  ChevronsUpIcon,
  EllipsisIcon,
  PauseIcon,
  XIcon,
} from 'lucide-react';
import React from 'react';
import SimpleTooltip from '../simple-tooltip';
import { Badge } from '../ui/badge';

const variants = {
  [VerificationStatus.None]: {
    Icon: PauseIcon,
    style: 'text-warning',
  },
  [VerificationStatus.PreRejected]: {
    Icon: EllipsisIcon,
    style: 'text-status-rejected',
  },
  [VerificationStatus.PreVerified]: {
    Icon: ChevronsUpIcon,
    style: 'text-status-verified',
  },
  [VerificationStatus.Rejected]: {
    Icon: XIcon,
    style: 'text-status-rejected',
  },
  [VerificationStatus.Verified]: {
    Icon: CheckIcon,
    style: 'text-status-verified',
  },
};

export default function VerificationBadge({
  verificationStatus,
  displayText = false,
}: {
  verificationStatus: VerificationStatus;

  /** Include verification status as text instead of a tooltip */
  displayText?: boolean;
}) {
  const { text } = VerificationStatusEnumHelper.getMetadata(verificationStatus);
  const { Icon, style } = variants[verificationStatus];

  return (
    <Outer tooltip={displayText ? undefined : text}>
      <Badge className={style} variant={'secondary'}>
        <Icon /> {displayText && text}
      </Badge>
    </Outer>
  );
}

function Outer({
  tooltip,
  children,
}: {
  tooltip?: string;
  children: React.ReactElement;
}) {
  return tooltip ? (
    <SimpleTooltip content={tooltip}>{children}</SimpleTooltip>
  ) : (
    children
  );
}

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
    style:
      'bg-warning/90 text-warning-foreground border-warning/50 hover:bg-warning',
  },
  [VerificationStatus.PreRejected]: {
    Icon: EllipsisIcon,
    style:
      'bg-destructive/90 text-white border-destructive/50 hover:bg-destructive',
  },
  [VerificationStatus.PreVerified]: {
    Icon: ChevronsUpIcon,
    style:
      'bg-success/90 text-success-foreground border-success/50 hover:bg-success',
  },
  [VerificationStatus.Rejected]: {
    Icon: XIcon,
    style:
      'bg-destructive/90 text-white border-destructive/50 hover:bg-destructive',
  },
  [VerificationStatus.Verified]: {
    Icon: CheckIcon,
    style:
      'bg-success/90 text-success-foreground border-success/50 hover:bg-success',
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
      <Badge
        className={`${style} font-medium shadow-sm transition-colors`}
        variant={'outline'}
      >
        <Icon className="h-3 w-3" />
        {displayText && <span className="ml-1">{text}</span>}
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

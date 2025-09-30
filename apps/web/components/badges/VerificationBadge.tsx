import { VerificationStatusEnumHelper } from '@/lib/enums';
import {
  VerificationStatus,
  GameWarningFlags,
  MatchWarningFlags,
  GameRejectionReason,
  MatchRejectionReason,
  ScoreRejectionReason,
  TournamentRejectionReason,
} from '@otr/core/osu';
import {
  CheckCircle2, // Verified
  Square, // PreVerified
  AlertTriangle, // PreRejected
  XCircle, // Rejected
  Clock, // None/Pending
} from 'lucide-react';
import React from 'react';
import SimpleTooltip from '../simple-tooltip';
import { cn } from '@/lib/utils';
import {
  GameRejectionReasonEnumHelper,
  GameWarningFlagsEnumHelper,
  MatchRejectionReasonEnumHelper,
  MatchWarningFlagsEnumHelper,
  ScoreRejectionReasonEnumHelper,
  TournamentRejectionReasonEnumHelper,
} from '@/lib/enums';
import { ApiItemType } from '@/lib/types';

const statusConfig = {
  [VerificationStatus.None]: {
    Icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
  },
  [VerificationStatus.PreRejected]: {
    Icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/20',
  },
  [VerificationStatus.PreVerified]: {
    Icon: Square,
    color: 'text-success',
    bgColor: 'bg-success/20',
  },
  [VerificationStatus.Rejected]: {
    Icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
  },
  [VerificationStatus.Verified]: {
    Icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/20',
  },
};

const sizeVariants = {
  small: {
    container: 'h-6 w-auto min-w-6',
    icon: 'h-4 w-4',
    text: 'text-sm',
    padding: 'px-2 py-1',
  },
  large: {
    container: 'h-8 w-auto min-w-8',
    icon: 'h-5 w-5',
    text: 'text-base',
    padding: 'px-3 py-1.5',
  },
};

type EntityWarningFlags = GameWarningFlags | MatchWarningFlags | undefined;
type EntityRejectionReason =
  | GameRejectionReason
  | MatchRejectionReason
  | ScoreRejectionReason
  | TournamentRejectionReason
  | undefined;

interface VerificationBadgeProps {
  verificationStatus: VerificationStatus;
  /** Include verification status as text instead of a tooltip. Will show tooltip if warnings or rejections are present. */
  displayText?: boolean;
  /** Size variant of the badge */
  size?: 'small' | 'large';
  /** Remove background styling (for matches page) */
  minimal?: boolean;
  /** Warning flags for the entity */
  warningFlags?: EntityWarningFlags;
  /** Rejection reason for the entity */
  rejectionReason?: EntityRejectionReason;
  /** Entity type for proper enum handling */
  entityType?: ApiItemType;
  /** Game index for tooltip (when used in games column) */
  gameIndex?: number;
}

function getWarningMetadata(
  warningFlags: EntityWarningFlags,
  entityType?: ApiItemType
) {
  if (!warningFlags || (warningFlags as number) === 0 || !entityType) {
    return [];
  }

  switch (entityType) {
    case 'game':
      return GameWarningFlagsEnumHelper.getMetadata(
        warningFlags as GameWarningFlags
      ).filter(
        (m): m is NonNullable<typeof m> => m !== undefined && m.text !== ''
      );
    case 'match':
      return MatchWarningFlagsEnumHelper.getMetadata(
        warningFlags as MatchWarningFlags
      ).filter(
        (m): m is NonNullable<typeof m> => m !== undefined && m.text !== ''
      );
    default:
      return [
        {
          text: `[BUG]: Unexpected warning flag value ${warningFlags} for type ${entityType}`,
          description: '',
        },
      ];
  }
}

function getRejectionMetadata(
  rejectionReason: EntityRejectionReason,
  entityType?: ApiItemType
) {
  if (!rejectionReason || (rejectionReason as number) === 0 || !entityType) {
    return [];
  }

  switch (entityType) {
    case 'game':
      return GameRejectionReasonEnumHelper.getMetadata(
        rejectionReason as GameRejectionReason
      );
    case 'match':
      return MatchRejectionReasonEnumHelper.getMetadata(
        rejectionReason as MatchRejectionReason
      );
    case 'score':
      return ScoreRejectionReasonEnumHelper.getMetadata(
        rejectionReason as ScoreRejectionReason
      );
    case 'tournament':
      return TournamentRejectionReasonEnumHelper.getMetadata(
        rejectionReason as TournamentRejectionReason
      );
    default:
      return [
        {
          text: `[BUG]: Unexpected rejection reason value ${rejectionReason} for type ${entityType}`,
          description: '',
        },
      ];
  }
}

function getBadgeStyles(
  verificationStatus: VerificationStatus,
  hasWarnings: boolean,
  minimal: boolean
) {
  const config = statusConfig[verificationStatus];

  // Override colors for warnings
  const color = hasWarnings ? 'text-orange-500' : config.color;
  const bgColor = hasWarnings ? 'bg-orange-500/20' : config.bgColor;

  const baseStyles = [
    'inline-flex items-center justify-center transition-colors',
    color,
  ];

  if (!minimal) {
    baseStyles.push(
      'rounded-md border',
      bgColor,
      'border-current/20',
      'hover:border-current/40'
    );
  }

  return baseStyles;
}

function createTooltipContent(
  statusText: string,
  warningMetadata: Array<{ text: string }>,
  rejectionMetadata: Array<{ text: string }>,
  gameIndex?: number
) {
  return (
    <div>
      {gameIndex !== undefined && (
        <p className="font-bold">Game {gameIndex + 1}</p>
      )}
      <p>{statusText}</p>

      {warningMetadata.length > 0 && (
        <div className="mt-2">
          <strong className="text-orange-500">Warnings:</strong>
          <ul className="mt-1 list-disc pl-3.5">
            {warningMetadata.map(({ text }, index) => (
              <li key={`warning-${index}`}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      {rejectionMetadata.length > 0 && (
        <div className="mt-2">
          <strong className="text-destructive">Rejection Reasons:</strong>
          <ul className="mt-1 list-disc pl-3.5">
            {rejectionMetadata.map(({ text }, index) => (
              <li key={`rejection-${index}`}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function VerificationBadge({
  verificationStatus,
  displayText = false,
  size = 'small',
  minimal = false,
  warningFlags,
  rejectionReason,
  entityType,
  gameIndex,
}: VerificationBadgeProps) {
  const { text: statusText } =
    VerificationStatusEnumHelper.getMetadata(verificationStatus);
  const sizeConfig = sizeVariants[size];
  const { Icon } = statusConfig[verificationStatus];

  const hasWarnings =
    warningFlags !== undefined && (warningFlags as number) !== 0;
  const hasRejections =
    rejectionReason !== undefined && (rejectionReason as number) !== 0;

  const warningMetadata = getWarningMetadata(warningFlags, entityType);
  const rejectionMetadata = getRejectionMetadata(rejectionReason, entityType);

  const badgeStyles = getBadgeStyles(verificationStatus, hasWarnings, minimal);

  const badge = (
    <div
      className={cn(
        ...badgeStyles,
        sizeConfig.container,
        displayText ? sizeConfig.padding : 'p-1'
      )}
    >
      <Icon className={sizeConfig.icon} />
      {displayText && (
        <span className={cn('ml-1.5 font-medium', sizeConfig.text)}>
          {statusText}
        </span>
      )}
    </div>
  );

  // Show tooltip if there are warnings, rejections, or if displayText is false
  const shouldShowTooltip = !displayText || hasWarnings || hasRejections;

  if (!shouldShowTooltip) {
    return badge;
  }

  const tooltipContent = createTooltipContent(
    statusText,
    warningMetadata,
    rejectionMetadata,
    gameIndex
  );

  return <SimpleTooltip content={tooltipContent}>{badge}</SimpleTooltip>;
}

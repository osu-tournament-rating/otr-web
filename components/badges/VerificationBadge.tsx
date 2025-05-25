import { VerificationStatusEnumHelper } from '@/lib/enums';
import {
  VerificationStatus,
  GameWarningFlags,
  MatchWarningFlags,
  GameRejectionReason,
  MatchRejectionReason,
  ScoreRejectionReason,
  TournamentRejectionReason,
} from '@osu-tournament-rating/otr-api-client';
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

const statusDisplayConfig = {
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

  // Check for warnings and rejections
  const hasWarnings =
    warningFlags !== undefined && (warningFlags as number) !== 0;
  const isRejected =
    rejectionReason !== undefined && (rejectionReason as number) !== 0;

  // Determine FinalIcon, finalColor, and finalBgColor
  let {
    Icon: FinalIcon,
    color: finalColor,
    bgColor: finalBgColor,
  } = statusDisplayConfig[verificationStatus];

  if (hasWarnings) {
    finalColor = 'text-orange-500';
    finalBgColor = 'bg-orange-500/20';
    // For statuses other than PreVerified or PreRejected with warnings, use AlertTriangle icon.
    // PreVerified/PreRejected with warnings will retain their original icon but adopt the orange color.
    if (
      verificationStatus !== VerificationStatus.PreVerified &&
      verificationStatus !== VerificationStatus.PreRejected
    ) {
      FinalIcon = AlertTriangle;
    }
  }

  // Get metadata for tooltips
  const getWarningMetadata = () => {
    if (!hasWarnings || !entityType) return [];

    let metadata;
    switch (entityType) {
      case 'game':
        metadata = GameWarningFlagsEnumHelper.getMetadata(
          warningFlags as GameWarningFlags
        );
        break;
      case 'match':
        metadata = MatchWarningFlagsEnumHelper.getMetadata(
          warningFlags as MatchWarningFlags
        );
        break;
      default:
        // Fallback for unexpected warning flags on other entity types.
        if (warningFlags && (warningFlags as number) !== 0) {
          return [
            {
              text: `[BUG]: Unexpected warning flag value ${warningFlags} for type ${entityType}`,
              description: '',
            },
          ];
        }
        return [];
    }
    return metadata.filter(
      (m): m is NonNullable<typeof m> => m !== undefined && m.text !== ''
    );
  };

  const getRejectionMetadata = () => {
    if (!isRejected || !entityType) return [];

    let metadata;
    switch (entityType) {
      case 'game':
        metadata = GameRejectionReasonEnumHelper.getMetadata(
          rejectionReason as GameRejectionReason
        );
        break;
      case 'match':
        metadata = MatchRejectionReasonEnumHelper.getMetadata(
          rejectionReason as MatchRejectionReason
        );
        break;
      case 'score':
        metadata = ScoreRejectionReasonEnumHelper.getMetadata(
          rejectionReason as ScoreRejectionReason
        );
        break;
      case 'tournament':
        metadata = TournamentRejectionReasonEnumHelper.getMetadata(
          rejectionReason as TournamentRejectionReason
        );
        break;
      default:
        // Fallback for unexpected rejection reasons on other entity types.
        if (rejectionReason && (rejectionReason as number) !== 0) {
          return [
            {
              text: `[BUG]: Unexpected rejection reason value ${rejectionReason} for type ${entityType}`,
              description: '',
            },
          ];
        }
        return [];
    }
    return metadata;
  };

  const warningMetadata = getWarningMetadata();
  const rejectionMetadata = getRejectionMetadata();

  const badge = (
    <div
      className={cn(
        'inline-flex items-center justify-center transition-colors',
        sizeConfig.container,
        displayText ? sizeConfig.padding : 'p-1',
        finalColor,
        !minimal && [
          'rounded-md border',
          finalBgColor,
          'border-current/20',
          'hover:border-current/40',
        ]
      )}
    >
      <FinalIcon className={sizeConfig.icon} />
      {displayText && (
        <span className={cn('ml-1.5 font-medium', sizeConfig.text)}>
          {statusText}
        </span>
      )}
    </div>
  );

  // Enhanced tooltip content for games column usage
  const tooltipContent =
    gameIndex !== undefined ? (
      <div>
        <p className="font-bold">Game {gameIndex + 1}</p>
        <p>{statusText}</p>
        {hasWarnings && warningMetadata.length > 0 && (
          <div className="mt-2">
            <strong className="text-orange-500">Warnings:</strong>
            <ul className="mt-1 list-disc pl-3.5">
              {warningMetadata.map(({ text: warningText }, index) => (
                <li key={`warning-${index}`}>{warningText}</li>
              ))}
            </ul>
          </div>
        )}
        {isRejected && rejectionMetadata.length > 0 && (
          <div className="mt-2">
            <strong className="text-destructive">Rejection Reasons:</strong>
            <ul className="mt-1 list-disc pl-3.5">
              {rejectionMetadata.map(({ text: rejectionText }, index) => (
                <li key={`rejection-${index}`}>{rejectionText}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ) : (
      <div>
        <p>{statusText}</p>
        {hasWarnings && warningMetadata.length > 0 && (
          <div className="mt-2">
            <strong className="text-orange-500">Warnings:</strong>
            <ul className="mt-1 list-disc pl-3.5">
              {warningMetadata.map(({ text: warningText }, index) => (
                <li key={`warning-${index}`}>{warningText}</li>
              ))}
            </ul>
          </div>
        )}
        {isRejected && rejectionMetadata.length > 0 && (
          <div className="mt-2">
            <strong className="text-destructive">Rejection Reasons:</strong>
            <ul className="mt-1 list-disc pl-3.5">
              {rejectionMetadata.map(({ text: rejectionText }, index) => (
                <li key={`rejection-${index}`}>{rejectionText}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );

  // If displayText is true, only return the badge directly if there are no warnings or rejections.
  // Otherwise, wrap it in a tooltip to show the details.
  if (displayText && !hasWarnings && !isRejected) {
    return badge;
  }

  // In all other cases (displayText is false, or displayText is true with warnings/rejections), show the tooltip.
  return <SimpleTooltip content={tooltipContent}>{badge}</SimpleTooltip>;
}

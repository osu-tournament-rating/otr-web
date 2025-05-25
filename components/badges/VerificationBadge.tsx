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
  AlertTriangle, // PreRejected/PreVerified with warnings
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

const variants = {
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
  /** Include verification status as text instead of a tooltip */
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
  entityType?: 'game' | 'match' | 'score' | 'tournament';
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
  const { text } = VerificationStatusEnumHelper.getMetadata(verificationStatus);
  const { Icon, color, bgColor } = variants[verificationStatus];
  const sizeConfig = sizeVariants[size];

  // Check for warnings and rejections
  const hasWarnings = warningFlags !== undefined && warningFlags !== 0;
  const isRejected = rejectionReason !== undefined && rejectionReason !== 0;

  // Override icon for PreVerified with warnings
  let FinalIcon = Icon;
  let finalColor = color;
  if (verificationStatus === VerificationStatus.PreVerified && hasWarnings) {
    FinalIcon = AlertTriangle;
    finalColor = 'text-warning';
  }

  // Get metadata for tooltips
  const getWarningMetadata = () => {
    if (!hasWarnings || !entityType) return [];

    switch (entityType) {
      case 'game':
        return GameWarningFlagsEnumHelper.getMetadata(
          warningFlags as GameWarningFlags
        ).filter(Boolean);
      case 'match':
        return MatchWarningFlagsEnumHelper.getMetadata(
          warningFlags as MatchWarningFlags
        ).filter(Boolean);
      default:
        return [];
    }
  };

  const getRejectionMetadata = () => {
    if (!isRejected || !entityType) return [];

    switch (entityType) {
      case 'game':
        return GameRejectionReasonEnumHelper.getMetadata(
          rejectionReason as GameRejectionReason
        ).filter(Boolean);
      case 'match':
        return MatchRejectionReasonEnumHelper.getMetadata(
          rejectionReason as MatchRejectionReason
        ).filter(Boolean);
      case 'score':
        return ScoreRejectionReasonEnumHelper.getMetadata(
          rejectionReason as ScoreRejectionReason
        ).filter(Boolean);
      case 'tournament':
        return TournamentRejectionReasonEnumHelper.getMetadata(
          rejectionReason as TournamentRejectionReason
        ).filter(Boolean);
      default:
        return [];
    }
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
          bgColor,
          'border-current/20',
          'hover:border-current/40',
        ]
      )}
    >
      <FinalIcon className={sizeConfig.icon} />
      {displayText && (
        <span className={cn('ml-1.5 font-medium', sizeConfig.text)}>
          {text}
        </span>
      )}
    </div>
  );

  // Enhanced tooltip content for games column usage
  const tooltipContent =
    gameIndex !== undefined ? (
      <div>
        <p className="font-bold">Game {gameIndex + 1}</p>
        <p>{text}</p>
        {isRejected && rejectionMetadata.length > 0 && (
          <div className="mt-1">
            <p className="font-semibold">Rejection Reasons:</p>
            <ul className="list-disc pl-3.5">
              {rejectionMetadata.map(({ text: reasonText, description }) => (
                <li key={reasonText}>{reasonText || description}</li>
              ))}
            </ul>
          </div>
        )}
        {hasWarnings && warningMetadata.length > 0 && (
          <div className="mt-1">
            <p className="font-semibold">Warnings:</p>
            <ul className="list-disc pl-3.5">
              {warningMetadata.map(({ text: warningText, description }) => (
                <li key={warningText}>{warningText || description}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ) : (
      text
    );

  return displayText ? (
    badge
  ) : (
    <SimpleTooltip content={tooltipContent}>{badge}</SimpleTooltip>
  );
}

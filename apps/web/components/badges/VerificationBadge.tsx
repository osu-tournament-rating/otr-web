import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
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
  CheckCircle2,
  Square,
  AlertTriangle,
  XCircle,
  Clock,
  UserCheck,
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
} from '@/lib/enum-helpers';
import { ApiItemType } from '@/lib/types';

const statusConfig = {
  [VerificationStatus.None]: {
    Icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
  },
  [VerificationStatus.PreRejected]: {
    Icon: AlertTriangle,
    color: 'text-warning-foreground',
    bgColor: 'bg-warning/20',
  },
  [VerificationStatus.PreVerified]: {
    Icon: Square,
    color: 'text-success-foreground',
    bgColor: 'bg-success/20',
  },
  [VerificationStatus.Rejected]: {
    Icon: XCircle,
    color: 'text-destructive-foreground',
    bgColor: 'bg-destructive/20',
  },
  [VerificationStatus.Verified]: {
    Icon: CheckCircle2,
    color: 'text-success-foreground',
    bgColor: 'bg-success/20',
  },
};

const sizeVariants = {
  pip: {
    container: 'h-4 w-4',
    icon: 'h-3.5 w-3.5',
    text: 'text-xs',
    padding: 'p-0',
    iconPadding: 'p-0',
  },
  xsmall: {
    container: 'h-5 w-auto min-w-5',
    icon: 'h-3 w-3',
    text: 'text-xs',
    padding: 'px-1.5 py-0.5',
    iconPadding: 'p-1',
  },
  small: {
    container: 'h-6 w-auto min-w-6',
    icon: 'h-4 w-4',
    text: 'text-sm',
    padding: 'px-2 py-1',
    iconPadding: 'p-1',
  },
  large: {
    container: 'h-8 w-auto min-w-8',
    icon: 'h-5 w-5',
    text: 'text-base',
    padding: 'px-3 py-1.5',
    iconPadding: 'p-1',
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
  /** Status as text instead of a tooltip; warnings and rejections still get one. */
  displayText?: boolean;
  size?: 'pip' | 'xsmall' | 'small' | 'large';
  /** Drop the badge background. */
  minimal?: boolean;
  /** Strike the label; the icon is left alone. */
  strikethrough?: boolean;
  /**
   * Set where the badge renders inside a link, option, or other control, which
   * cannot hold a nested tooltip trigger. The badge then carries its status as
   * text and its tooltip is reachable by pointer only. An ancestor that sets
   * its own `aria-label` replaces that text, so it has to name the status
   * itself. Warning and rejection detail stays pointer-only either way, so do
   * not pair this with `displayText` on an entity that has any.
   */
  insideControl?: boolean;
  warningFlags?: EntityWarningFlags;
  rejectionReason?: EntityRejectionReason;
  entityType?: ApiItemType;
  gameIndex?: number;
  verifierUsername?: string;
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

  return { styles: baseStyles, color };
}

function createTooltipContent(
  statusText: string,
  warningMetadata: Array<{ text: string }>,
  rejectionMetadata: Array<{ text: string }>,
  gameIndex?: number,
  verifierUsername?: string,
  verificationStatus?: VerificationStatus
) {
  const shouldShowVerifier =
    verifierUsername &&
    (verificationStatus === VerificationStatus.Verified ||
      verificationStatus === VerificationStatus.Rejected);

  return (
    <div>
      {gameIndex !== undefined && (
        <p className="font-bold">Game {gameIndex + 1}</p>
      )}
      {!shouldShowVerifier && <p>{statusText}</p>}

      {shouldShowVerifier && (
        <div className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" />
          <span>{verifierUsername}</span>
        </div>
      )}

      {warningMetadata.length > 0 && (
        <div className="mt-2">
          <strong className="text-amber-700 dark:text-amber-400">
            Warnings:
          </strong>
          <ul className="mt-1 list-disc pl-3.5">
            {warningMetadata.map(({ text }, index) => (
              <li key={`warning-${index}`}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      {rejectionMetadata.length > 0 && (
        <div className="mt-2">
          <strong className="text-destructive-foreground">
            Rejection Reasons:
          </strong>
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
  strikethrough = false,
  insideControl = false,
  warningFlags,
  rejectionReason,
  entityType,
  gameIndex,
  verifierUsername,
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

  const { styles: badgeStyles, color: iconColor } = getBadgeStyles(
    verificationStatus,
    hasWarnings,
    minimal
  );

  // A pip strip is summarised by its container, so it does not repeat itself.
  const nameStatus = insideControl && !displayText && size !== 'pip';

  const badge = (
    <span
      className={cn(
        ...badgeStyles,
        sizeConfig.container,
        displayText ? sizeConfig.padding : sizeConfig.iconPadding
      )}
    >
      <Icon className={cn(sizeConfig.icon, iconColor)} />
      {nameStatus && <span className="sr-only">{statusText}</span>}
      {displayText && (
        <span
          className={cn(
            'ml-1.5 font-medium',
            sizeConfig.text,
            strikethrough && 'line-through'
          )}
        >
          {statusText}
        </span>
      )}
    </span>
  );

  const hasVerifier =
    verifierUsername &&
    (verificationStatus === VerificationStatus.Verified ||
      verificationStatus === VerificationStatus.Rejected);

  const showTooltip =
    !displayText || hasWarnings || hasRejections || hasVerifier;

  if (!showTooltip) {
    return badge;
  }

  const tooltipContent = createTooltipContent(
    statusText,
    warningMetadata,
    rejectionMetadata,
    gameIndex,
    verifierUsername,
    verificationStatus
  );

  return (
    <SimpleTooltip
      content={tooltipContent}
      // A pip strip renders one badge per game and its container already
      // summarises them, so pips stay out of the tab order.
      asChild={insideControl || size === 'pip'}
      triggerAriaLabel={displayText ? undefined : statusText}
    >
      {badge}
    </SimpleTooltip>
  );
}

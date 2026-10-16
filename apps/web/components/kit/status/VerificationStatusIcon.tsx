import { VerificationStatus } from '@otr/core/osu';
import {
  CircleCheck,
  CircleDashedCheck,
  CircleX,
  Clock,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import { CircleDashedX } from '@/components/kit/status/CircleDashedX';
import {
  VerificationStatusTooltip,
  type VerificationStatusDetailsProps,
  type VerificationStatusTooltipMode,
} from '@/components/kit/status/VerificationStatusTooltip';
import {
  getVerificationStatusHue,
  getVerificationStatusLabel,
  type StatusHue,
} from '@/lib/kit/status/verification';
import { cn } from '@/lib/utils';

/** The glyph carries the outcome; a dashed outline means an automated check. */
const GLYPHS: Record<VerificationStatus, LucideIcon> = {
  [VerificationStatus.Verified]: CircleCheck,
  [VerificationStatus.PreVerified]: CircleDashedCheck,
  [VerificationStatus.None]: Clock,
  [VerificationStatus.PreRejected]: CircleDashedX,
  [VerificationStatus.Rejected]: CircleX,
};

// Verification keeps its own palette (globals.css `--verification-*`). The
// pre-states take their outcome's hue; the dashed outline marks them.
const HUE_CLASSES: Record<StatusHue, string> = {
  success: 'text-verification-verified',
  neutral: 'text-verification-neutral',
  destructive: 'text-verification-rejected',
};

export type VerificationStatusIconSize = 'sm' | 'md' | 'lg';

const ICON_SIZES: Record<VerificationStatusIconSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
};

const WARNING_MARKER_SIZES: Record<VerificationStatusIconSize, string> = {
  sm: 'size-2.5',
  md: 'size-3',
  lg: 'size-3.5',
};

/**
 * The bare status glyph in its status colour, hidden from assistive tech.
 * Use it where the status name is already written next to it, such as a
 * legend; otherwise use `VerificationStatusIcon`.
 */
export function VerificationStatusGlyph({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const Glyph = GLYPHS[status] ?? Clock;

  return (
    <Glyph
      aria-hidden="true"
      className={cn(
        'shrink-0',
        HUE_CLASSES[getVerificationStatusHue(status)],
        className
      )}
    />
  );
}

/** The small triangle that flags warnings beside a status, never instead of it. */
export function StatusWarningMarker({ className }: { className?: string }) {
  return (
    <TriangleAlert
      aria-hidden="true"
      className={cn('shrink-0 text-warning', className)}
    />
  );
}

/**
 * Verification status as an icon, for table cells, game pips and dense
 * rows. Every state reads in greyscale; warnings add a marker. Pass
 * `tooltip` wherever the name is not written next to it.
 */
export function VerificationStatusIcon({
  status,
  size = 'md',
  warnings,
  rejectionReasons,
  reviewer,
  context,
  tooltip,
  decorative = false,
  className,
}: VerificationStatusDetailsProps & {
  /** `sm` for inline text, `md` for rows, `lg` for headers. */
  size?: VerificationStatusIconSize;
  /** `tap` opens on tap, hover and focus; use `hover` only inside a link. */
  tooltip?: VerificationStatusTooltipMode;
  /** Hide it from assistive tech because the name is written beside it. */
  decorative?: boolean;
  className?: string;
}) {
  const hasWarnings = (warnings?.length ?? 0) > 0;
  const label = getVerificationStatusLabel(status, { context, hasWarnings });
  const hidden = decorative || tooltip === 'tap';

  const icon = (
    <span
      data-slot="verification-status-icon"
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 align-middle',
        className
      )}
      {...(hidden
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label })}
    >
      <VerificationStatusGlyph status={status} className={ICON_SIZES[size]} />
      {hasWarnings ? (
        <StatusWarningMarker className={WARNING_MARKER_SIZES[size]} />
      ) : null}
    </span>
  );

  if (!tooltip || decorative) {
    return icon;
  }

  return (
    <VerificationStatusTooltip
      mode={tooltip}
      label={label}
      status={status}
      warnings={warnings}
      rejectionReasons={rejectionReasons}
      reviewer={reviewer}
      context={context}
    >
      {icon}
    </VerificationStatusTooltip>
  );
}

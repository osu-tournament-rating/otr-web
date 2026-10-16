import { ReportStatus } from '@otr/core/osu';
import { CircleCheck, CircleX, Clock, type LucideIcon } from 'lucide-react';

import { Badge, type BadgeSize } from '@/components/kit/status/Badge';
import type { VerificationStatusTooltipMode } from '@/components/kit/status/VerificationStatusTooltip';
import SimpleTooltip from '@/components/simple-tooltip';
import TapTooltip from '@/components/tap-tooltip';
import { getReportStatusCopy } from '@/lib/kit/status/report';

const ICONS: Record<ReportStatus, LucideIcon> = {
  [ReportStatus.Pending]: Clock,
  [ReportStatus.Approved]: CircleCheck,
  [ReportStatus.Rejected]: CircleX,
};

/**
 * A data report's state on My reports and the admin queue: Pending,
 * Confirmed or Dismissed. It reuses the status language: a clock while
 * waiting, then a green check or a red cross for the admin's outcome.
 */
export function ReportStatusBadge({
  status,
  size = 'md',
  tooltip,
  className,
}: {
  status: ReportStatus;
  size?: BadgeSize;
  /** Adds the plain-language line; `hover` only inside a link. */
  tooltip?: VerificationStatusTooltipMode;
  className?: string;
}) {
  const { name, summary, tone } = getReportStatusCopy(status);
  const Icon = ICONS[status] ?? Clock;

  const badge = (
    <Badge
      data-slot="report-status-badge"
      tone={tone}
      size={size}
      className={className}
    >
      <Icon aria-hidden="true" />
      {name}
    </Badge>
  );

  if (!tooltip) {
    return badge;
  }

  const content = (
    <span className="block max-w-64 text-left text-pretty">
      <span className="font-semibold">{name}:</span> {summary}
    </span>
  );

  if (tooltip === 'hover') {
    return <SimpleTooltip content={content}>{badge}</SimpleTooltip>;
  }

  return (
    <TapTooltip
      side="top"
      content={content}
      triggerAriaLabel={`Report status: ${name}`}
      triggerClassName="inline-flex w-auto shrink-0 rounded-full align-middle"
    >
      {badge}
    </TapTooltip>
  );
}

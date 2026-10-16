import { VerificationStatus } from '@otr/core/osu';
import { UserCheck } from 'lucide-react';
import type * as React from 'react';

import SimpleTooltip from '@/components/simple-tooltip';
import TapTooltip from '@/components/tap-tooltip';
import { getVerificationStatusCopy } from '@/lib/kit/status/verification';
import { cn } from '@/lib/utils';

export type VerificationStatusTooltipMode = 'tap' | 'hover';

export interface VerificationStatusDetailsProps {
  status: VerificationStatus;
  /** Warning texts; any warning adds the marker. See `getWarningTexts`. */
  warnings?: readonly string[];
  /** Rejection reason texts. See `getRejectionReasonTexts`. */
  rejectionReasons?: readonly string[];
  /** Who verified or rejected it; shown for those two states only. */
  reviewer?: string | null;
  /** Which item this is when several sit together, such as "Game 3". */
  context?: string;
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="mt-0.5 list-disc pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** The tooltip body: the plain-language line, then reviewer, warnings and reasons. */
export function VerificationStatusDetails({
  status,
  warnings,
  rejectionReasons,
  reviewer,
  context,
}: VerificationStatusDetailsProps) {
  const { name, summary } = getVerificationStatusCopy(status);
  const reviewerLabel =
    status === VerificationStatus.Verified
      ? 'Verified by'
      : status === VerificationStatus.Rejected
        ? 'Rejected by'
        : null;

  return (
    <div className="flex max-w-64 flex-col gap-1.5 text-left text-pretty">
      {context ? <p className="font-semibold">{context}</p> : null}
      <p>
        <span className="font-semibold proportional-nums">{name}:</span>{' '}
        {summary}
      </p>
      {reviewer && reviewerLabel ? (
        <p className="flex items-center gap-1.5">
          <UserCheck className="size-3.5 shrink-0" aria-hidden="true" />
          {reviewerLabel} {reviewer}
        </p>
      ) : null}
      {warnings && warnings.length > 0 ? (
        <DetailList title="Warnings" items={warnings} />
      ) : null}
      {rejectionReasons && rejectionReasons.length > 0 ? (
        <DetailList title="Rejection reasons" items={rejectionReasons} />
      ) : null}
    </div>
  );
}

/**
 * Wraps a status icon or badge in its explanation. `tap` opens on tap,
 * hover and focus and is the default; `hover` adds no button, for use
 * inside a link.
 */
export function VerificationStatusTooltip({
  mode = 'tap',
  label,
  side = 'top',
  triggerClassName,
  children,
  ...details
}: VerificationStatusDetailsProps & {
  mode?: VerificationStatusTooltipMode;
  /** Accessible name for the tap trigger, from `getVerificationStatusLabel`. */
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const content = <VerificationStatusDetails {...details} />;

  if (mode === 'hover') {
    return (
      <SimpleTooltip side={side} content={content}>
        {children}
      </SimpleTooltip>
    );
  }

  return (
    <TapTooltip
      side={side}
      content={content}
      triggerAriaLabel={label}
      triggerClassName={cn(
        'inline-flex w-auto shrink-0 rounded-full align-middle',
        triggerClassName
      )}
    >
      {children}
    </TapTooltip>
  );
}

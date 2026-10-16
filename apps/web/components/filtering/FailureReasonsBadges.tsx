import { FilteringFailReason } from '@otr/core/osu';

import { Badge } from '@/components/kit/status/Badge';
import TapTooltip from '@/components/tap-tooltip';

/** The reasons the filter tool can set today: its form has only rating bounds. */
const VISIBLE_FAILURE_REASONS = [
  {
    flag: FilteringFailReason.MinRating,
    label: 'Low rating',
    description: "The player's rating is below the minimum threshold",
  },
  {
    flag: FilteringFailReason.MaxRating,
    label: 'High rating',
    description: "The player's rating is above the maximum threshold",
  },
] as const;

function getVisibleReasons(failureReason: number | null | undefined) {
  if (!failureReason) return [];
  return VISIBLE_FAILURE_REASONS.filter(
    (reason) => (failureReason & reason.flag) !== 0
  );
}

/** "Low rating", "High rating": one name per reason the filter set. */
export function getFailureReasons(
  failureReason: number | null | undefined
): string[] {
  return getVisibleReasons(failureReason).map((reason) => reason.label);
}

/**
 * Why a player failed the filter, as red badges whose explanation opens on
 * tap, hover and focus. Renders nothing when no visible reason is set.
 */
export default function FailureReasonsBadges({
  failureReason,
}: {
  failureReason: number | null | undefined;
}) {
  const reasons = getVisibleReasons(failureReason);
  if (reasons.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap gap-1">
      {reasons.map((reason) => (
        <TapTooltip
          key={reason.flag}
          content={reason.description}
          side="top"
          triggerAriaLabel={`${reason.label}: ${reason.description}`}
          triggerClassName="w-auto rounded-full"
        >
          <Badge tone="destructive" size="sm">
            {reason.label}
          </Badge>
        </TapTooltip>
      ))}
    </span>
  );
}

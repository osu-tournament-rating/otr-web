import { FilteringFailReason } from '@otr/core/osu';

import { Badge } from '@/components/kit/status/Badge';
import TapTooltip from '@/components/tap-tooltip';
import {
  FILTERING_FAIL_REASON_DESCRIPTIONS,
  FILTERING_FAIL_REASON_LABELS,
  getSetFlags,
} from '@/lib/kit/format/enum-labels';

/** The reasons the filter tool can set today: its form has only rating bounds. */
const VISIBLE_FAILURE_REASONS: readonly FilteringFailReason[] = [
  FilteringFailReason.MinRating,
  FilteringFailReason.MaxRating,
];

function getVisibleReasons(
  failureReason: number | null | undefined
): FilteringFailReason[] {
  return getSetFlags(failureReason ?? 0, FILTERING_FAIL_REASON_LABELS).filter(
    (flag) => VISIBLE_FAILURE_REASONS.includes(flag)
  );
}

/** "Low rating", "High rating": one name per reason the filter set. */
export function getFailureReasons(
  failureReason: number | null | undefined
): string[] {
  return getVisibleReasons(failureReason).map(
    (flag) => FILTERING_FAIL_REASON_LABELS[flag]
  );
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
      {reasons.map((flag) => {
        const label = FILTERING_FAIL_REASON_LABELS[flag];
        const description = FILTERING_FAIL_REASON_DESCRIPTIONS[flag];
        return (
          <TapTooltip
            key={flag}
            content={description}
            side="top"
            triggerAriaLabel={`${label}: ${description}`}
            triggerClassName="w-auto rounded-full"
          >
            <Badge tone="destructive" size="sm">
              {label}
            </Badge>
          </TapTooltip>
        );
      })}
    </span>
  );
}

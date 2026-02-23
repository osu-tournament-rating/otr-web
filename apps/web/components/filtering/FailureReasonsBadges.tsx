import { FilteringFailReason } from '@otr/core/osu';
import { FilteringFailReasonEnumHelper } from '@/lib/enum-helpers';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Bitmask of failure reasons shown in the UI (rating-related only) */
const VISIBLE_FAILURE_MASK =
  FilteringFailReason.MinRating | FilteringFailReason.MaxRating;

/** Masks a failure reason to only include visible (rating-related) flags */
function maskFailureReason(
  failureReason: number | undefined
): FilteringFailReason {
  if (!failureReason) return FilteringFailReason.None;
  return (failureReason & VISIBLE_FAILURE_MASK) as FilteringFailReason;
}

interface FailureReasonsBadgesProps {
  failureReason?: FilteringFailReason;
}

export default function FailureReasonsBadges({
  failureReason,
}: FailureReasonsBadgesProps) {
  const masked = maskFailureReason(failureReason);

  if (masked === FilteringFailReason.None) {
    return <div className="text-muted-foreground text-center">-</div>;
  }

  const reasons = FilteringFailReasonEnumHelper.getMetadata(masked);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap justify-center gap-1">
        {reasons.map((reason) => (
          <Tooltip key={reason.text}>
            <TooltipTrigger asChild>
              <Badge
                variant="destructive"
                className="cursor-help px-1.5 py-0.5 text-[10px]"
              >
                {reason.text}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{reason.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function getFailureReasons(failureReason?: number): string[] {
  const masked = maskFailureReason(failureReason);
  if (masked === FilteringFailReason.None) return [];

  return FilteringFailReasonEnumHelper.getMetadata(masked).map(
    (metadata) => metadata.text
  );
}

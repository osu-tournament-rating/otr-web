import { FilteringFailReason } from '@otr/core/osu';
import { FilteringFailReasonEnumHelper } from '@/lib/enums';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FailureReasonsBadgesProps {
  failureReason?: FilteringFailReason;
}

export default function FailureReasonsBadges({
  failureReason,
}: FailureReasonsBadgesProps) {
  if (
    failureReason === undefined ||
    failureReason === null ||
    failureReason === FilteringFailReason.None
  ) {
    return <div className="text-muted-foreground text-center">-</div>;
  }

  const reasons = FilteringFailReasonEnumHelper.getMetadata(failureReason);

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
  if (!failureReason || failureReason === FilteringFailReason.None) return [];

  return FilteringFailReasonEnumHelper.getMetadata(failureReason).map(
    (metadata) => metadata.text
  );
}

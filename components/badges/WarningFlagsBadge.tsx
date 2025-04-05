import {
  GameWarningFlagsEnumHelper,
  MatchWarningFlagsEnumHelper,
} from '@/lib/enums';
import { ApiItemType } from '@/lib/types';
import { TriangleAlertIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

export default function WarningFlagsBadge({
  itemType,
  value,
}: {
  itemType: Omit<ApiItemType, 'tournament' | 'score'>;
  value: number;
}) {
  if (value === 0) {
    return null;
  }

  const metadata =
    itemType === 'match'
      ? MatchWarningFlagsEnumHelper.getMetadata(value)
      : GameWarningFlagsEnumHelper.getMetadata(value);

  if (metadata.includes(undefined)) {
    metadata.push({
      text: `[BUG]: Received unexpected warning flag value. Metadata is undefined for flag ${value} on type ${itemType}`,
      description: '',
    });
  }

  return (
    <Tooltip>
      <TooltipContent>
        <div>
          <strong>Warnings:</strong>
          <ul className="mt-1 list-disc pl-3.5">
            {metadata.map(({ text }, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      </TooltipContent>
      <TooltipTrigger>
        <Badge className="text-warning" variant={'outline'}>
          <TriangleAlertIcon />
        </Badge>
      </TooltipTrigger>
    </Tooltip>
  );
}

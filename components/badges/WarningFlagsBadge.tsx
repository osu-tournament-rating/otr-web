import {
  GameWarningFlagsEnumHelper,
  MatchWarningFlagsEnumHelper,
} from '@/lib/enums';
import { ApiItemType } from '@/lib/types';
import { TriangleAlertIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';

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

  return (
    <Tooltip>
      <TooltipContent>
        <ul>
          {metadata.map(({ text }, index) => (
              <li key={index}>• {text}</li>
          ))}
        </ul>
      </TooltipContent>
      <TooltipTrigger>
        <Badge className="text-warning" variant={'outline'}>
          <TriangleAlertIcon />
        </Badge>
      </TooltipTrigger>
    </Tooltip>
  );
}

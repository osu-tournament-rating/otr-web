import {
  GameWarningFlagsEnumHelper,
  MatchWarningFlagsEnumHelper,
} from '@/lib/enums';
import { ApiItemType } from '@/lib/types';
import { TriangleAlertIcon } from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';
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

  let tooltipText = '';
  metadata.map(({ text }) => {
    tooltipText += `• ${text}\n`;
  });

  return (
    <SimpleTooltip content={tooltipText}>
      <Badge className="text-warning" variant={'outline'}>
        <TriangleAlertIcon />
      </Badge>
    </SimpleTooltip>
  );
}

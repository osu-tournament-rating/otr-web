import {
  GameWarningFlagsEnumHelper,
  MatchWarningFlagsEnumHelper,
} from '@/lib/enums';
import { ApiItemType } from '@/lib/types';
import { Badge } from '../ui/badge';
import { TriangleAlertIcon } from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';

export default function WarningFlagsBadge({
  itemType,
  value,
}: {
  itemType: Pick<ApiItemType, 'match' | 'game'>;
  value: number;
}) {
  if (value === 0) {
    return null;
  }

  const metadata = itemType === 'match'
    ? MatchWarningFlagsEnumHelper.getMetadata(value)
    : GameWarningFlagsEnumHelper.getMetadata(value);

  let tooltipText = '';
  metadata.map(({ text, description }, index) => {
    tooltipText += `• ${text}\n`;
  });

  return (
    <SimpleTooltip content={tooltipText}>
      <Badge className="text-yellow-400" variant={'outline'}>
        <TriangleAlertIcon />
      </Badge>
    </SimpleTooltip>
  );
}

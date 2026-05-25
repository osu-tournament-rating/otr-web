import { GameRejectionReasonEnumHelper } from '@/lib/enum-helpers';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { GameRejectionReason } from '@otr/core/osu';

export default function GameRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(GameRejectionReasonEnumHelper.metadata)
        .filter(([value]) => Number(value) !== GameRejectionReason.None)
        .map(([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        ))}
    </SelectContent>
  );
}

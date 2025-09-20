import { GameRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { GameRejectionReason } from '@/lib/osu/enums';

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

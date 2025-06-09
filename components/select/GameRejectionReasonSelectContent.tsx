import { GameRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';

export default function GameRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(GameRejectionReasonEnumHelper.metadata).map(
        ([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}

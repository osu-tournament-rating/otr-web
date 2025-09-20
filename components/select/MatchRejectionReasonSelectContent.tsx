import { MatchRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { MatchRejectionReason } from '@/lib/osu/enums';

export default function MatchRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(MatchRejectionReasonEnumHelper.metadata)
        .filter(([value]) => Number(value) !== MatchRejectionReason.None)
        .map(([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        ))}
    </SelectContent>
  );
}

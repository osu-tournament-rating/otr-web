import { MatchRejectionReasonEnumHelper } from '@/lib/enum-helpers';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { MatchRejectionReason } from '@otr/core/osu';

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

import { MatchRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';

export default function MatchRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(MatchRejectionReasonEnumHelper.metadata).map(
        ([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}

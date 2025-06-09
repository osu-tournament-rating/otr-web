import { ScoreRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';

export default function ScoreRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(ScoreRejectionReasonEnumHelper.metadata).map(
        ([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}

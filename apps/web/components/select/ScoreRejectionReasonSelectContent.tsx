import { ScoreRejectionReasonEnumHelper } from '@/lib/enum-helpers';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { ScoreRejectionReason } from '@otr/core/osu';

export default function ScoreRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(ScoreRejectionReasonEnumHelper.metadata)
        .filter(([value]) => Number(value) !== ScoreRejectionReason.None)
        .map(([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        ))}
    </SelectContent>
  );
}

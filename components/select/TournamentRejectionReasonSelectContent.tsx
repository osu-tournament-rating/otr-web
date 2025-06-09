import { TournamentRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';

export default function TournamentRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(TournamentRejectionReasonEnumHelper.metadata).map(
        ([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}

import { TournamentRejectionReasonEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { TournamentRejectionReason } from '@otr/core/osu';

export default function TournamentRejectionReasonSelectContent() {
  return (
    <SelectContent>
      {Object.entries(TournamentRejectionReasonEnumHelper.metadata)
        .filter(([value]) => Number(value) !== TournamentRejectionReason.None)
        .map(([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        ))}
    </SelectContent>
  );
}

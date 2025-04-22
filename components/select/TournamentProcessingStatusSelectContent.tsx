import { TournamentProcessingStatusEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '../ui/select';

export default function TournamentProcessingStatusSelectContent() {
  return (
    <SelectContent>
      {Object.entries(TournamentProcessingStatusEnumHelper.metadata).map(
        ([k, { text }]) => (
          <SelectItem key={`processingStatus-${k}`} value={k}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}

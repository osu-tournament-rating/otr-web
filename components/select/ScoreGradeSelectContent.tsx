import { ScoreGradeEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '@/components/ui/select';

export default function ScoreGradeSelectContent() {
  return (
    <SelectContent>
      {Object.entries(ScoreGradeEnumHelper.metadata).map(
        ([value, { text }]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}

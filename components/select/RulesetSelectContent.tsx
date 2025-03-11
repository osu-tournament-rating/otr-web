import { RulesetEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '../ui/select';

export default function RulesetSelectContent() {
  return (
    <SelectContent>
      {Object.entries(RulesetEnumHelper.metadata).map(([k, { text }]) => (
        <SelectItem key={`ruleset-${k}`} value={k}>
          {text}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

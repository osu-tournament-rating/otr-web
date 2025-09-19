import { RulesetEnumHelper } from '@/lib/enums';
import { Ruleset } from '@/lib/osu/enums';
import { SelectContent, SelectItem } from '../ui/select';

export default function RulesetSelectContent({
  maniaOther = true,
}: {
  maniaOther?: boolean;
}) {
  return (
    <SelectContent>
      {Object.entries(RulesetEnumHelper.metadata).map(([k, { text }]) => {
        if (Number(k) === Ruleset.ManiaOther && !maniaOther) {
          return null;
        }

        return (
          <SelectItem key={`ruleset-${k}`} value={k}>
            {text}
          </SelectItem>
        );
      })}
    </SelectContent>
  );
}

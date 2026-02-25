import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { Ruleset } from '@otr/core/osu';
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

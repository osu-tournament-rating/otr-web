import { RulesetEnumHelper } from '@/lib/enums';
import { SelectContent, SelectItem } from '../ui/select';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';

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

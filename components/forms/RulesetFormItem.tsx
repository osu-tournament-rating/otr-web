import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { FormControl, FormItem, FormLabel } from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { RulesetEnumHelper } from '@/lib/enums';

export default function RulesetFormItem({
  onChange,
  value,
}: {
  onChange: (...event: any[]) => void;
  value: string;
}) {
  function rulesetString(ruleset: Ruleset) {
    return RulesetEnumHelper.getMetadata(ruleset).text;
  }

  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Ruleset</FormLabel>
      <Select onValueChange={onChange} defaultValue={value}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ruleset" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value={rulesetString(Ruleset.Osu)}>
            {rulesetString(Ruleset.Osu)}
          </SelectItem>
          <SelectItem value={rulesetString(Ruleset.Taiko)}>
            {rulesetString(Ruleset.Taiko)}
          </SelectItem>
          <SelectItem value={rulesetString(Ruleset.Catch)}>
            {rulesetString(Ruleset.Catch)}
          </SelectItem>
          <SelectItem value={rulesetString(Ruleset.Mania4k)}>
            {rulesetString(Ruleset.Mania4k)}
          </SelectItem>
          <SelectItem value={rulesetString(Ruleset.Mania7k)}>
            {rulesetString(Ruleset.Mania7k)}
          </SelectItem>
          <SelectItem value={rulesetString(Ruleset.ManiaOther)}>
            {rulesetString(Ruleset.ManiaOther)}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  );
}

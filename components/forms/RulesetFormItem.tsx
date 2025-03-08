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
          <SelectItem value="0">{rulesetString(Ruleset.Osu)}</SelectItem>
          <SelectItem value="1">{rulesetString(Ruleset.Taiko)}</SelectItem>
          <SelectItem value="2">{rulesetString(Ruleset.Catch)}</SelectItem>
          <SelectItem value="4">{rulesetString(Ruleset.Mania4k)}</SelectItem>
          <SelectItem value="5">{rulesetString(Ruleset.Mania7k)}</SelectItem>
          <SelectItem value="3">{rulesetString(Ruleset.ManiaOther)}</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  );
}

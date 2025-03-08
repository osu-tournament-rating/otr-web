import { rulesetString } from "@/lib/utils/enum-utils";
import { Ruleset } from "@osu-tournament-rating/otr-api-client";
import { FormControl, FormItem, FormLabel } from "../ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ControllerRenderProps } from "react-hook-form";

export default function RulesetFormItem({
  field,
}: {
  field: ControllerRenderProps<
    {
      name: string;
      abbreviation: string;
      ruleset: string;
      rankRange: number;
      verificationStatus: string;
      forumUrl: string;
      lobbySize: number;
    },
    'ruleset'
  >;
}) {
    console.log(field);
  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Ruleset</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ruleset" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="0">{rulesetString(Ruleset.Osu)}</SelectItem>
          <SelectItem value="1">{rulesetString(Ruleset.Taiko)}</SelectItem>
          <SelectItem value="2">{rulesetString(Ruleset.Catch)}</SelectItem>
          <SelectItem value="4">
            {rulesetString(Ruleset.Mania4k)}
          </SelectItem>
          <SelectItem value="5">
            {rulesetString(Ruleset.Mania7k)}
          </SelectItem>
          <SelectItem value="3">
            {rulesetString(Ruleset.ManiaOther)}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  );
}
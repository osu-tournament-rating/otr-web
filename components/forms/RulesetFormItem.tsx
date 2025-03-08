'use client';

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
  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Ruleset</FormLabel>
      <Select onValueChange={onChange} value={value}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ruleset" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {Object.entries(RulesetEnumHelper.metadata).map(([k, { text }]) => (
            <SelectItem key={`ruleset-${k}`} value={k}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  );
}

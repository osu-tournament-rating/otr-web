'use client';

import { FormControl, FormItem, FormLabel } from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export default function LobbySizeFormItem({
  onChange,
  value,
}: {
  onChange: (...event: any[]) => void;
  value: string;
}) {
  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Format</FormLabel>
      <Select onValueChange={onChange} defaultValue={value}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {[...Array(8)].map((_, i) => (
            <SelectItem key={`lobbysize-${i + 1}`} value={(i + 1).toString()}>
              {i + 1}v{i + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  );
}

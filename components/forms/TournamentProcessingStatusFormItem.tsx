import { TournamentProcessingStatus } from '@osu-tournament-rating/otr-api-client';
import { FormControl, FormItem, FormLabel } from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TournamentProcessingStatusEnumHelper } from '@/lib/enums';

export default function TournamentProcessingStatusFormItem({
  onChange,
  value,
}: {
  onChange: (...event: any[]) => void;
  value: string;
}) {
  console.log(value);
  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Processing Status</FormLabel>
      <Select onValueChange={onChange} value={value} disabled>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Processing Status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {Object.entries(TournamentProcessingStatusEnumHelper.metadata).map(
            ([k, { text }]) => (
              <SelectItem key={`processingStatus-${k}`} value={k}>
                {text}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </FormItem>
  );
}

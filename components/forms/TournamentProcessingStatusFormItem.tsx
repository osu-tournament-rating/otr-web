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
  function processingStatusString(
    processingStatus: TournamentProcessingStatus
  ) {
    return TournamentProcessingStatusEnumHelper.getMetadata(processingStatus)
      .text;
  }

  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Processing Status</FormLabel>
      <Select
        onValueChange={onChange}
        defaultValue={value}
        disabled={true}
      >
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Processing Status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem
            value={processingStatusString(
              TournamentProcessingStatus.NeedsApproval
            )}
          >
            {processingStatusString(TournamentProcessingStatus.NeedsApproval)}
          </SelectItem>
          <SelectItem
            value={processingStatusString(
              TournamentProcessingStatus.NeedsMatchData
            )}
          >
            {processingStatusString(TournamentProcessingStatus.NeedsMatchData)}
          </SelectItem>
          <SelectItem
            value={processingStatusString(
              TournamentProcessingStatus.NeedsAutomationChecks
            )}
          >
            {processingStatusString(
              TournamentProcessingStatus.NeedsAutomationChecks
            )}
          </SelectItem>
          <SelectItem
            value={processingStatusString(
              TournamentProcessingStatus.NeedsVerification
            )}
          >
            {processingStatusString(
              TournamentProcessingStatus.NeedsVerification
            )}
          </SelectItem>
          <SelectItem
            value={processingStatusString(
              TournamentProcessingStatus.NeedsStatCalculation
            )}
          >
            {processingStatusString(
              TournamentProcessingStatus.NeedsStatCalculation
            )}
          </SelectItem>
          <SelectItem
            value={processingStatusString(
              TournamentProcessingStatus.Done
            )}
          >
            {processingStatusString(
              TournamentProcessingStatus.Done
            )}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  );
}

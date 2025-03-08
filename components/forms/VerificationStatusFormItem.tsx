import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import { FormControl, FormItem, FormLabel } from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { VerificationStatusEnumHelper } from '@/lib/enums';

export default function VerificationStatusFormItem({
  onChange,
  value,
}: {
  onChange: (...event: any[]) => void;
  value: string;
}) {
  function verificationStatusString(verificationStatus: VerificationStatus) {
    return VerificationStatusEnumHelper.getMetadata(verificationStatus).text;
  }

  return (
    <FormItem className="min-w-1/3">
      <FormLabel>Verification Status</FormLabel>
      <Select onValueChange={onChange} defaultValue={value}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Verification Status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value={verificationStatusString(VerificationStatus.None)}>
            {verificationStatusString(VerificationStatus.None)}
          </SelectItem>
          <SelectItem
            value={verificationStatusString(VerificationStatus.PreRejected)}
          >
            {verificationStatusString(VerificationStatus.PreRejected)}
          </SelectItem>
          <SelectItem
            value={verificationStatusString(VerificationStatus.PreVerified)}
          >
            {verificationStatusString(VerificationStatus.PreVerified)}
          </SelectItem>
          <SelectItem
            value={verificationStatusString(VerificationStatus.Rejected)}
          >
            {verificationStatusString(VerificationStatus.Rejected)}
          </SelectItem>
          <SelectItem
            value={verificationStatusString(VerificationStatus.Verified)}
          >
            {verificationStatusString(VerificationStatus.Verified)}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  );
}

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
        <FormControl>r
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Verification Status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value={VerificationStatus.None.toString()}>
            {verificationStatusString(VerificationStatus.None)}
          </SelectItem>
          <SelectItem value={VerificationStatus.PreRejected.toString()}>
            {verificationStatusString(VerificationStatus.PreRejected)}
          </SelectItem>
          <SelectItem value={VerificationStatus.PreVerified.toString()}>
            {verificationStatusString(VerificationStatus.PreVerified)}
          </SelectItem>
          <SelectItem value={VerificationStatus.Rejected.toString()}>
            {verificationStatusString(VerificationStatus.Rejected)}
          </SelectItem>
          <SelectItem value={VerificationStatus.Verified.toString()}>
            {verificationStatusString(VerificationStatus.Verified)}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  );
}
